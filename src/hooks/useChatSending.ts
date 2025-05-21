
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/sonner";
import { Chat, Message, SendMessageResult } from "../types/chat";
import { User } from "@supabase/supabase-js";
import { generateChatTitle } from "../utils/chatUtils";
import { ErrorTracker, generateRequestId } from "@/utils/logging";

export const useChatSending = (
  user: User | null,
  currentChatId: string | null,
  createNewChat: () => Promise<string | null>,
  handleMessageUpdate: (chatId: string, message: Message, requestId?: string) => Promise<void>,
  setIsLoadingResponse: (loading: boolean) => void,
  getCurrentChat: () => Chat | null,
  addMessageToChat: (chatId: string, message: Message) => void
) => {
  const sendMessage = async (content: string): Promise<SendMessageResult> => {
    const requestId = generateRequestId();
    const errorTracker = new ErrorTracker('useChatSending', user?.id);
    
    try {
      await errorTracker.logStage('send_message', 'start', { requestId });
      
      if (!content.trim()) {
        toast.error("Message cannot be empty");
        return { success: false, error: "Message cannot be empty" };
      }
      
      if (!user) {
        toast.error("Please sign in to send messages");
        return { success: false, error: "Authentication required" };
      }
      
      // Get or create chat ID
      let chatId = currentChatId;
      let isNewChat = false;
      
      if (!chatId) {
        chatId = await createNewChat();
        if (!chatId) {
          return { success: false, error: "Failed to create chat" };
        }
        isNewChat = true;
        console.log("Created new chat:", chatId);
      }
      
      // Create and add user message - both to state and DB
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: content,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      // Update UI state immediately for better user experience
      addMessageToChat(chatId, userMessage);
      console.log("Added user message to state:", userMessage);
      
      // Then persist to database (don't wait for this to complete)
      handleMessageUpdate(chatId, userMessage, requestId)
        .catch(err => console.error("Error saving user message:", err));
      
      // Set loading state
      setIsLoadingResponse(true);
      
      try {
        await errorTracker.logStage('ai_request', 'start', { chatId, messageId: userMessage.id });
        
        // Get current chat to send context
        const chat = getCurrentChat();
        if (!chat) {
          console.error("Failed to get current chat after message update");
          setIsLoadingResponse(false);
          return { success: false, error: "Failed to load chat context" };
        }
        
        // Use the messages from the chat object we just retrieved
        const messages = chat?.messages || [];
        
        console.log("Sending request to edge function with:", {
          content,
          messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
          chatId,
          requestId,
          // Add a flag to use the new concise format
          useSimpleFormat: true
        });
        
        // Send to edge function with the new flag
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { 
            content: content,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            chatId,
            requestId,
            useSimpleFormat: true
          },
        });
        
        console.log("Response from edge function:", { data, error });
        
        if (error) {
          console.error("Error from edge function:", error);
          await errorTracker.logError(
            "Error from edge function", 
            error,
            { chatId }
          );
          
          toast.error("Failed to get AI response");
          setIsLoadingResponse(false);
          return { success: false, error: error.message };
        }
        
        if (!data) {
          console.error("Invalid response from edge function:", data);
          await errorTracker.logError(
            "Invalid response from edge function", 
            new Error("No data returned"),
            { chatId, response: data }
          );
          
          toast.error("Received an invalid response");
          setIsLoadingResponse(false);
          return { success: false, error: "Invalid response format" };
        }
        
        // Check for error in the response
        if (data.error) {
          console.error("Error in API response:", data.error);
          await errorTracker.logError(
            "Error in API response", 
            new Error(data.error),
            { chatId, response: data }
          );
          
          toast.error(data.message || "Failed to get AI response");
          setIsLoadingResponse(false);
          return { success: false, error: data.error };
        }
        
        // Support both message and content fields in the response
        const responseContent = data.message || data.content;
        
        if (!responseContent) {
          console.error("No message content in response:", data);
          await errorTracker.logError(
            "No message content in response", 
            new Error("No message or content field in response"),
            { chatId, response: data }
          );
          
          toast.error("Received an incomplete response");
          setIsLoadingResponse(false);
          return { success: false, error: "No message content in response" };
        }
        
        // Create assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: responseContent,
          createdAt: new Date().toISOString(),
          timestamp: Date.now(),
          metadata: {
            model: data.model,
            tokensUsed: data.tokensUsed,
            responseTimeMs: data.response_time_ms,
            sourceInfo: data.sourceInfo
          }
        };
        
        await errorTracker.logStage('ai_request', 'complete', { 
          chatId,
          responseTimeMs: data.response_time_ms,
          tokensUsed: data.tokensUsed
        });
        
        // Update UI state immediately
        addMessageToChat(chatId, assistantMessage);
        console.log("Added assistant response to state:", assistantMessage);
        
        // Then persist to database (don't wait for this to complete)
        handleMessageUpdate(chatId, assistantMessage, requestId)
          .catch(err => console.error("Error saving assistant message:", err));
        
        // If this is a new chat, generate title from first message and update the chat title
        if (isNewChat) {
          try {
            const title = await generateChatTitle(content);
            
            // Update the chat title in the database
            const { error: updateError } = await supabase
              .from('chats')
              .update({ title })
              .eq('id', chatId);
              
            if (updateError) {
              console.error("Error updating chat title:", updateError);
            } else {
              console.log("Chat title updated:", title);
            }
          } catch (e) {
            console.error("Error generating chat title:", e);
          }
        }
        
        await errorTracker.logStage('send_message', 'complete', { 
          requestId,
          chatId 
        });
        
        return { success: true };
      } catch (error) {
        console.error("Exception in AI request:", error);
        await errorTracker.logError(
          "Exception in AI request",
          error,
          { chatId, requestId }
        );
        
        toast.error("Failed to process your request");
        return { success: false, error: String(error) };
      } finally {
        setIsLoadingResponse(false);
      }
    } catch (error) {
      console.error("Exception in sendMessage:", error);
      await errorTracker.logError(
        "Exception in sendMessage",
        error
      );
      
      setIsLoadingResponse(false);
      toast.error("Something went wrong");
      return { success: false, error: String(error) };
    }
  };

  return { sendMessage };
};
