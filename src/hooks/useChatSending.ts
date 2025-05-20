
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
  getCurrentChat: () => Chat | null
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
      
      // If no current chat, create a new one
      let chatId = currentChatId;
      let isNewChat = false;
      
      if (!chatId) {
        chatId = await createNewChat();
        if (!chatId) {
          return { success: false, error: "Failed to create chat" };
        }
        isNewChat = true;
      }
      
      // Create and add user message
      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: content,
        createdAt: new Date().toISOString(),
        timestamp: Date.now()
      };
      
      await handleMessageUpdate(chatId, userMessage, requestId);
      
      // Set loading state
      setIsLoadingResponse(true);
      
      try {
        await errorTracker.logStage('ai_request', 'start', { chatId, messageId: userMessage.id });
        
        // Get current chat to send context to the AI
        const chat = getCurrentChat();
        const messages = chat?.messages || [];
        
        // Send to edge function
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { 
            content,
            messages: messages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          },
        });
        
        if (error) {
          await errorTracker.logError(
            "Error from edge function", 
            error,
            { chatId }
          );
          
          toast.error("Failed to get AI response");
          setIsLoadingResponse(false);
          return { success: false, error: error.message };
        }
        
        // Create assistant message
        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: data.message || "I couldn't generate a response at this time.",
          createdAt: new Date().toISOString(),
          timestamp: Date.now(),
          metadata: {
            model: data.model,
            tokensUsed: data.tokens_used,
            responseTimeMs: data.response_time_ms,
            sourceInfo: data.source_info
          }
        };
        
        await errorTracker.logStage('ai_request', 'complete', { 
          chatId,
          responseTimeMs: data.response_time_ms,
          tokensUsed: data.tokens_used
        });
        
        // Add assistant response
        await handleMessageUpdate(chatId, assistantMessage, requestId);
        
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
      await errorTracker.logError(
        "Exception in sendMessage",
        error
      );
      
      toast.error("Something went wrong");
      return { success: false, error: String(error) };
    }
  };

  return { sendMessage };
};
