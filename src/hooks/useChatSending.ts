
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";
import { Message } from "../types/chat";
import { 
  generateRequestId, 
  logChatEvent, 
  logChatError, 
  startTimer, 
  calculateDuration,
  ErrorTracker,
  formatErrorForLogging,
  createErrorEventName
} from "../utils/chatLogging";

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
    const errorTracker = new ErrorTracker(requestId, 'useChatSending', user?.id, currentChatId || undefined);
    
    // Create more detailed event metadata
    const initialMetadata = { 
      contentLength: content.length,
      hasDocIds: !!docIds && docIds.length > 0,
      documentCount: docIds?.length || 0,
      isAuthenticated: !!user,
      isGuest
    };
    
    await logChatEvent({
      requestId,
      userId: user?.id,
      chatId: currentChatId,
      eventType: 'send_message_started',
      component: 'useChatSending',
      message: `User sending message`,
      metadata: initialMetadata
    });
    
    try {
      // Authentication validation with more detailed error info
      if (!user && !isGuest) {
        await logChatEvent({
          requestId,
          eventType: 'send_message_auth_error',
          component: 'useChatSending',
          message: `Unauthenticated user tried to send message`,
          severity: 'warning',
          category: 'auth'
        });
        
        toast.error("Please sign in to send messages");
        return;
      }

      // Content validation
      if (!content.trim()) {
        await logChatEvent({
          requestId,
          userId: user?.id,
          eventType: 'send_message_empty',
          component: 'useChatSending',
          message: `Empty message submission prevented`,
          severity: 'info'
        });
        return;
      }

      // Chat creation with enhanced error tracking
      let chatId = currentChatId;
      if (!chatId) {
        await errorTracker.logStage('create_chat', 'start');
        
        try {
          chatId = await createNewChat();
          
          if (!chatId) {
            await errorTracker.logError(
              'Failed to create new chat for message',
              new Error('Chat ID returned as null'),
              { userId: user?.id },
              'error',
              'database'
            );
            return;
          }
          
          await logChatEvent({
            requestId,
            userId: user?.id,
            chatId,
            eventType: 'create_chat_success',
            component: 'useChatSending',
            message: `New chat created with ID: ${chatId}`,
            metadata: { chatId }
          });
          
          // Update the tracker with the new chat ID
          errorTracker.chatId = chatId;
        } catch (createChatError) {
          await errorTracker.logError(
            'Exception creating new chat',
            createChatError,
            { userId: user?.id },
            'error',
            'database'
          );
          return;
        }
      }

      // Use provided document IDs or the document context
      const documentIds = docIds || getDocumentContext();

      // Log detailed message metadata
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
        timestamp: Date.now(),
        documentIds: documentIds.length > 0 ? documentIds : undefined
      };

      await logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'save_user_message',
        component: 'useChatSending',
        message: `Saving user message to chat`,
        metadata: { 
          messageId: userMessage.id, 
          documentCount: documentIds.length,
          contentLength: content.length,
          hasDocuments: documentIds.length > 0
        }
      });
      
      // Track message saving
      try {
        await handleMessageUpdate(chatId, userMessage, requestId);
      } catch (messageUpdateError) {
        await errorTracker.logError(
          'Failed to save user message',
          messageUpdateError,
          { chatId, messageId: userMessage.id },
          'error', 
          'database'
        );
        toast.error("Failed to save your message. Please try again.");
        return;
      }

      setIsLoadingResponse(true);

      try {
        const currentChat = getCurrentChat();
        const chatMessages = currentChat ? [...currentChat.messages, userMessage] : [userMessage];

        await logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'prepare_ai_request',
          component: 'useChatSending',
          message: `Preparing AI request with ${documentIds.length} documents and ${chatMessages.length} messages`,
          metadata: { 
            documentIds,
            documentCount: documentIds.length,
            messageCount: chatMessages.length
          }
        });
        
        // Detailed document fetch tracking
        let documentContents = [];
        try {
          await errorTracker.logStage('document_fetch', 'start', { documentCount: documentIds.length });
          documentContents = await fetchDocumentContents(documentIds, user?.id, chatId, requestId);
          await errorTracker.logStage('document_fetch', 'complete', { documentsReturned: documentContents.length });
        } catch (docError) {
          await errorTracker.logError(
            'Error fetching document contents',
            docError,
            { 
              documentIds, 
              chatId,
              userId: user?.id 
            },
            'error',
            'document'
          );
          
          // Continue with empty documents rather than failing completely
          documentContents = [];
          
          // Inform user but continue with the chat
          if (documentIds.length > 0) {
            toast.warning("Some document content couldn't be loaded, but we'll continue with your message.");
          }
        }

        await logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'call_ai_function',
          component: 'useChatSending',
          message: `Sending message to AI assistant with ${documentContents.length} documents`,
          metadata: {
            documentsReturned: documentContents.length,
            documentIds,
            documentParsed: documentContents.length > 0
          }
        });
        
        // More detailed AI call tracking
        const aiStartTime = startTimer();
        try {
          // Prepare call metadata for detailed tracking
          const aiRequestMetadata = {
            messageCount: chatMessages.length,
            documentCount: documentContents.length,
            contentLength: content.length
          };
          
          await errorTracker.logStage('ai_call', 'start', aiRequestMetadata);
          
          // Make the actual API call with detailed error handling
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
            // Enhanced error categorization
            const errorCategory = error.message?.includes('credentials') ? 'credential' : 
                                  error.message?.includes('document') ? 'document' : 
                                  error.message?.includes('parse') ? 'ai_response' : 'network';
            
            await errorTracker.logError(
              'Error from chat function',
              error,
              { 
                chatId,
                endpoint: 'chat',
                requestPayloadSize: JSON.stringify({ content, messages: chatMessages }).length,
                documentCount: documentContents.length
              },
              'critical',
              errorCategory
            );
            
            throw error;
          }
          
          await errorTracker.logStage('ai_call', 'complete', {
            duration: calculateDuration(aiStartTime),
            responseLength: data.message.length,
            referencedDocumentsCount: data.referencedDocuments?.length || 0
          });
          
          await logChatEvent({
            requestId,
            userId: user?.id,
            chatId,
            eventType: 'ai_response_received',
            component: 'useChatSending',
            message: `Received response from AI assistant`,
            durationMs: calculateDuration(aiStartTime),
            metadata: { 
              responseLength: data.message.length,
              referencedDocumentsCount: data.referencedDocuments?.length || 0,
              tokensUsed: data.usage?.total_tokens,
              promptTokens: data.usage?.prompt_tokens,
              completionTokens: data.usage?.completion_tokens,
              model: data.model || 'unknown'
            },
            category: 'ai_response'
          });

          const aiResponse: Message = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.message,
            timestamp: Date.now(),
            referencedDocuments: data.referencedDocuments
          };

          // Track saving the AI response
          try {
            await errorTracker.logStage('save_ai_response', 'start');
            await handleMessageUpdate(chatId, aiResponse, requestId);
            await errorTracker.logStage('save_ai_response', 'complete');
          } catch (saveResponseError) {
            await errorTracker.logError(
              'Failed to save AI response',
              saveResponseError,
              { chatId, messageId: aiResponse.id },
              'error',
              'database'
            );
            toast.error("The AI responded but we couldn't save the response. Please try again.");
          }
          
          await logChatEvent({
            requestId,
            userId: user?.id,
            chatId,
            eventType: 'conversation_completed',
            component: 'useChatSending',
            message: `Conversation cycle completed successfully`,
            durationMs: calculateDuration(startTime),
            metadata: {
              totalDuration: calculateDuration(startTime),
              aiDuration: calculateDuration(aiStartTime),
              responseLength: data.message.length,
              tokensUsed: data.usage?.total_tokens
            }
          });
        } catch (aiError) {
          // Process specific AI error types with enhanced diagnostics
          const errorInfo = formatErrorForLogging(aiError);
          
          // Determine specific error category based on error details
          let errorCategory = 'network';
          let errorMessage = 'Error getting AI response';
          
          if (errorInfo.message?.includes('document')) {
            errorCategory = 'document';
            errorMessage = 'Error processing document content';
          } else if (errorInfo.message?.includes('credential') || 
                     errorInfo.message?.includes('auth') || 
                     errorInfo.message?.includes('key')) {
            errorCategory = 'credential';
            errorMessage = 'Error with AI service authentication';
          } else if (errorInfo.message?.includes('model') || 
                     errorInfo.message?.includes('prompt') || 
                     errorInfo.message?.includes('token')) {
            errorCategory = 'ai_response';
            errorMessage = 'Error with AI model processing';
          }
          
          await errorTracker.logError(
            errorMessage,
            aiError,
            { 
              chatId,
              messageCount: chatMessages.length,
              documentCount: documentContents.length 
            },
            'critical',
            errorCategory as 'network' | 'document' | 'credential' | 'ai_response' | 'database' | 'generic'
          );
          
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "I'm sorry, there was an error processing your request. Please try again.",
            timestamp: Date.now(),
          };
          
          await logChatEvent({
            requestId,
            userId: user?.id,
            chatId,
            eventType: 'save_error_message',
            component: 'useChatSending',
            message: `Saving error message to chat`,
            metadata: { messageId: errorMessage.id }
          });
          
          try {
            await handleMessageUpdate(chatId, errorMessage, requestId);
          } catch (saveErrorMessageError) {
            await logChatError(
              requestId,
              'useChatSending',
              'Failed to save error message',
              saveErrorMessageError,
              { chatId, messageId: errorMessage.id },
              chatId,
              user?.id,
              'error',
              'database'
            );
          }
        } finally {
          setIsLoadingResponse(false);
        }
      } catch (error) {
        await errorTracker.logError(
          'Unexpected error in sendMessage',
          error,
          { 
            chatId: currentChatId,
            requestId
          },
          'critical',
          'generic'
        );
      } finally {
        setIsProcessing(false);
      }
    } catch (topLevelError) {
      // Catch any errors at the top level to ensure we always log them
      await logChatError(
        requestId,
        'useChatSending',
        'Critical error in sendMessage',
        topLevelError,
        { chatId: currentChatId },
        currentChatId || undefined,
        user?.id,
        'critical',
        'generic'
      );
      
      setIsProcessing(false);
      setIsLoadingResponse(false);
    }
  };

  return { sendMessage };
};
