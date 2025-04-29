
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";
import { Message } from "../types/chat";
import { generateRequestId, logChatEvent, logChatError, startTimer, calculateDuration } from "../utils/chatLogging";

export const useChatSending = (
  user: User | null,
  isGuest: boolean,
  currentChatId: string | null,
  createNewChat: () => Promise<string | null>,
  handleMessageUpdate: (chatId: string, message: Message, requestId?: string) => Promise<void>,
  setIsLoadingResponse: (isLoading: boolean) => void,
  getCurrentChat: () => any,
  getDocumentContext: () => string[],
  fetchDocumentContents: (documentIds: string[], userId?: string, chatId?: string, requestId?: string) => Promise<any[]>
) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = async (content: string, docIds?: string[]) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const requestId = generateRequestId();
    const startTime = startTimer();
    
    logChatEvent({
      requestId,
      userId: user?.id,
      chatId: currentChatId,
      eventType: 'send_message_started',
      component: 'useChatSending',
      message: `User sending message`,
      metadata: { 
        contentLength: content.length,
        hasDocIds: !!docIds && docIds.length > 0,
        documentCount: docIds?.length || 0 
      }
    });
    
    try {
      if (!user && !isGuest) {
        logChatEvent({
          requestId,
          eventType: 'send_message_auth_error',
          component: 'useChatSending',
          message: `Unauthenticated user tried to send message`,
          severity: 'warning'
        });
        
        toast.error("Please sign in to send messages");
        return;
      }

      if (!content.trim()) {
        logChatEvent({
          requestId,
          userId: user?.id,
          eventType: 'send_message_empty',
          component: 'useChatSending',
          message: `Empty message submission prevented`,
          severity: 'info'
        });
        return;
      }

      let chatId = currentChatId;
      if (!chatId) {
        logChatEvent({
          requestId,
          userId: user?.id,
          eventType: 'create_chat_for_message',
          component: 'useChatSending',
          message: `Creating new chat for message`
        });
        
        chatId = await createNewChat();
        if (!chatId) {
          logChatEvent({
            requestId,
            userId: user?.id,
            eventType: 'create_chat_failed',
            component: 'useChatSending',
            message: `Failed to create new chat for message`,
            severity: 'error'
          });
          return;
        }
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'create_chat_success',
          component: 'useChatSending',
          message: `New chat created with ID: ${chatId}`
        });
      }

      // Use provided document IDs or the document context
      const documentIds = docIds || getDocumentContext();

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
        documentIds: documentIds.length > 0 ? documentIds : undefined
      };

      logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'save_user_message',
        component: 'useChatSending',
        message: `Saving user message to chat`,
        metadata: { 
          messageId: userMessage.id, 
          documentCount: documentIds.length 
        }
      });
      
      await handleMessageUpdate(chatId, userMessage, requestId);

      setIsLoadingResponse(true);

      try {
        const currentChat = getCurrentChat();
        const chatMessages = currentChat ? [...currentChat.messages, userMessage] : [userMessage];

        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'prepare_ai_request',
          component: 'useChatSending',
          message: `Preparing AI request with ${documentIds.length} documents and ${chatMessages.length} messages`,
          metadata: { 
            documentIds,
            messageCount: chatMessages.length
          }
        });
        
        // Fetch document content for context if documentIds are provided
        const documentContents = await fetchDocumentContents(documentIds, user?.id, chatId, requestId);

        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'call_ai_function',
          component: 'useChatSending',
          message: `Sending message to AI assistant with ${documentContents.length} documents`
        });
        
        const aiStartTime = startTimer();
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { 
            content, 
            messages: chatMessages,
            documentIds,
            documentContents,
            requestId  // Pass request ID to the edge function for logging
          },
        });

        if (error) {
          await logChatError(
            requestId,
            'useChatSending',
            'Error from chat function',
            error,
            { chatId },
            chatId,
            user?.id,
            'critical'
          );
          throw error;
        }
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'ai_response_received',
          component: 'useChatSending',
          message: `Received response from AI assistant`,
          durationMs: calculateDuration(aiStartTime),
          metadata: { 
            responseLength: data.message.length,
            referencedDocumentsCount: data.referencedDocuments?.length || 0
          }
        });

        const aiResponse: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.message,
          timestamp: Date.now(),
          referencedDocuments: data.referencedDocuments
        };

        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'save_ai_response',
          component: 'useChatSending',
          message: `Saving AI response to chat`,
          metadata: { messageId: aiResponse.id }
        });
        
        await handleMessageUpdate(chatId, aiResponse, requestId);
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'conversation_completed',
          component: 'useChatSending',
          message: `Conversation cycle completed successfully`,
          durationMs: calculateDuration(startTime)
        });
      } catch (error) {
        await logChatError(
          requestId,
          'useChatSending',
          'Error getting AI response',
          error,
          { chatId },
          chatId,
          user?.id,
          'critical'
        );
        
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "I'm sorry, there was an error processing your request. Please try again.",
          timestamp: Date.now(),
        };
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'save_error_message',
          component: 'useChatSending',
          message: `Saving error message to chat`,
          metadata: { messageId: errorMessage.id }
        });
        
        await handleMessageUpdate(chatId, errorMessage, requestId);
      } finally {
        setIsLoadingResponse(false);
      }
    } catch (error) {
      await logChatError(
        requestId,
        'useChatSending',
        'Unexpected error in sendMessage',
        error,
        { chatId: currentChatId },
        currentChatId || undefined,
        user?.id,
        'critical'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return { sendMessage };
};
