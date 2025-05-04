
import { useState } from "react";
import { Message } from "../types/chat";
import { v4 as uuidv4 } from "uuid";
import { generateRequestId, logChatEvent, logChatError } from "../utils/chatLogging";
import { toast } from "@/components/ui/sonner";

export const useChatSending = (
  user,
  isGuest,
  currentChatId,
  createNewChat,
  handleMessageUpdate,
  setIsLoadingResponse,
  getCurrentChat
) => {
  const [pendingMessages, setPendingMessages] = useState<Record<string, boolean>>({});

  // Send a message to the chat
  const sendMessage = async (content: string) => {
    // Don't send blank messages
    if (!content?.trim()) {
      return;
    }

    // Get request ID for tracking
    const requestId = generateRequestId();

    // Initialize current chat if doesn't exist
    let chatId = currentChatId;
    if (!chatId) {
      try {
        chatId = await createNewChat();
        if (!chatId) {
          toast.error("Failed to create new chat");
          return;
        }
      } catch (error) {
        toast.error("Failed to create new chat");
        console.error("Error creating new chat:", error);
        return;
      }
    }
    
    // Track pending message for this request
    const messageId = uuidv4();
    setPendingMessages(prev => ({ ...prev, [messageId]: true }));
    
    // Set loading state
    setIsLoadingResponse(true);
    
    // Get the start time for timing the request
    const startTime = performance.now();

    try {
      // Log the chat request
      await logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'send_message',
        component: 'useChatSending',
        message: 'User message sent',
        metadata: { 
          messageLength: content.length,
          isAuthenticated: !!user?.id,
          isGuest: isGuest
        }
      });
      
      // Add the user message locally
      const userMessage: Message = {
        id: messageId,
        role: "user",
        content,
        timestamp: Date.now()
      };
      
      await handleMessageUpdate(chatId, userMessage);
      
      // Get the chat history after adding user message
      const currentChat = getCurrentChat();
      const chatHistory = currentChat?.messages || [];
      
      // Use the minimal history for the call (limit to last 20 messages)
      const streamlinedHistory = chatHistory.slice(-20);
      
      // Prepare the body for the API call
      const body = {
        message: content,
        chatId,
        chatHistory: streamlinedHistory,
        requestId
      };
      
      await logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'api_request_start',
        component: 'useChatSending',
        message: 'Making request to Edge Function',
        metadata: { 
          historyLength: streamlinedHistory.length 
        }
      });
      
      // Fetch from the chat Edge function
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke('chat', {
        body
      });
      
      const responseTime = Math.round(performance.now() - startTime);
      
      if (error) {
        throw new Error(`${error.message || 'Unknown error'}`);
      }
      
      // Check for error in the response data
      if (data.error) {
        throw new Error(`${data.error || 'Unknown error in response'}`);
      }
      
      await logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'api_request_success',
        component: 'useChatSending',
        message: 'Received successful response from Edge Function',
        durationMs: responseTime,
        metadata: { 
          tokensUsed: data.tokensUsed,
          model: data.model,
          messageLength: data.message?.length || 0
        },
        category: 'ai_response'
      });
      
      // Create assistant message
      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: data.message,
        timestamp: Date.now()
      };
      
      // Update the chat with the assistant response
      await handleMessageUpdate(chatId, assistantMessage);
      
    } catch (error) {
      // Log the error
      await logChatError(
        requestId,
        'useChatSending',
        `Error sending message: ${error.message || 'Unknown error'}`,
        error,
        { messageId },
        chatId,
        user?.id,
        'error'
      );
      
      // Show error to user
      toast.error(`Failed to send message: ${error.message || 'Unknown error'}`);
      console.error('Error sending message:', error);
      
    } finally {
      // Clear pending status for this message
      setPendingMessages(prev => {
        const updated = { ...prev };
        delete updated[messageId];
        return updated;
      });
      
      // Clear loading state
      setIsLoadingResponse(false);
    }
  };

  return { sendMessage, pendingMessages };
};
