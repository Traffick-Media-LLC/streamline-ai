
import { useAuth } from "@/contexts/AuthContext";
import { useChatsState } from "./useChatsState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { Message, Chat, DocumentReference } from "../types/chat";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { generateRequestId, logChatEvent, logChatError, startTimer, calculateDuration } from "../utils/chatLogging";

export const useChatOperations = () => {
  const { user, isGuest } = useAuth();
  const {
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    getCurrentChat: originalGetCurrentChat
  } = useChatsState();
  
  // Add chats state
  const [chats, setChats] = useState<Chat[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [documentContext, setDocumentContext] = useState<string[]>([]);

  // Fetch chats when user changes
  useEffect(() => {
    const requestId = generateRequestId();
    logChatEvent({
      requestId,
      userId: user?.id,
      eventType: 'auth_state_change',
      component: 'useChatOperations',
      message: `Chat operations - user or guest state changed: ${!!user}, ${isGuest}`,
      metadata: { isAuthenticated: !!user, isGuest }
    });
    
    if (user || isGuest) {
      fetchChats(requestId);
    }
  }, [user, isGuest]);

  // Function to fetch chats
  const fetchChats = async (requestId?: string) => {
    const chatRequestId = requestId || generateRequestId();
    const startTime = startTimer();
    
    logChatEvent({
      requestId: chatRequestId,
      userId: user?.id,
      eventType: 'fetch_chats_started',
      component: 'useChatOperations',
      message: `Fetching chats - user authenticated: ${!!user}, is guest: ${isGuest}`,
      metadata: { isAuthenticated: !!user, isGuest }
    });
    
    if (!user && !isGuest) {
      logChatEvent({
        requestId: chatRequestId,
        eventType: 'fetch_chats_skipped',
        component: 'useChatOperations',
        message: 'No user or guest, skipping chat fetch',
        durationMs: calculateDuration(startTime)
      });
      return;
    }
    
    setIsInitializing(true);
    
    try {
      if (isGuest) {
        // For guest users, we use local storage
        logChatEvent({
          requestId: chatRequestId,
          eventType: 'fetch_guest_chats_started',
          component: 'useChatOperations',
          message: 'Loading guest chats from local storage'
        });
        
        const storedChats = localStorage.getItem('guestChats');
        if (storedChats) {
          const parsedChats = JSON.parse(storedChats);
          setChats(parsedChats);
          
          logChatEvent({
            requestId: chatRequestId,
            eventType: 'fetch_guest_chats_completed',
            component: 'useChatOperations',
            message: 'Guest chats loaded successfully',
            durationMs: calculateDuration(startTime),
            metadata: { chatCount: parsedChats.length }
          });
        } else {
          logChatEvent({
            requestId: chatRequestId,
            eventType: 'fetch_guest_chats_empty',
            component: 'useChatOperations',
            message: 'No stored guest chats found',
            durationMs: calculateDuration(startTime)
          });
          setChats([]);
        }
      } else {
        // For authenticated users, fetch from Supabase
        logChatEvent({
          requestId: chatRequestId,
          userId: user.id,
          eventType: 'fetch_db_chats_started',
          component: 'useChatOperations',
          message: `Fetching chats for authenticated user: ${user.id}`
        });
        
        const fetchStartTime = startTimer();
        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            title,
            created_at,
            updated_at,
            chat_messages (
              id,
              role,
              content,
              timestamp,
              document_ids
            )
          `)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          await logChatError(
            chatRequestId,
            'useChatOperations',
            'Error fetching chats from database',
            error,
            { userId: user.id },
            null,
            user.id
          );
          toast.error("Failed to load chats");
          return;
        }

        logChatEvent({
          requestId: chatRequestId,
          userId: user.id,
          eventType: 'fetch_db_chats_completed',
          component: 'useChatOperations',
          message: `Fetched ${data.length} chats from database`,
          durationMs: calculateDuration(fetchStartTime),
          metadata: { chatCount: data.length }
        });
        
        const formattedChats = data.map(chat => ({
          id: chat.id,
          title: chat.title,
          messages: chat.chat_messages.map(msg => ({
            id: msg.id,
            role: msg.role as "user" | "assistant" | "system",
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime(),
            documentIds: msg.document_ids && msg.document_ids.length > 0 ? msg.document_ids : undefined
          })),
          createdAt: new Date(chat.created_at).getTime(),
          updatedAt: new Date(chat.updated_at).getTime()
        }));

        setChats(formattedChats);
        if (formattedChats.length > 0 && !currentChatId) {
          logChatEvent({
            requestId: chatRequestId,
            userId: user.id,
            eventType: 'auto_select_chat',
            component: 'useChatOperations',
            message: `Setting current chat ID to first chat: ${formattedChats[0].id}`,
            metadata: { selectedChatId: formattedChats[0].id }
          });
          
          setCurrentChatId(formattedChats[0].id);
          
          // Set document context if the first message has documents
          const firstChat = formattedChats[0];
          const lastUserMessage = [...firstChat.messages].reverse()
            .find(msg => msg.role === 'user' && msg.documentIds?.length);
            
          if (lastUserMessage?.documentIds) {
            setDocumentContext(lastUserMessage.documentIds);
            
            logChatEvent({
              requestId: chatRequestId,
              userId: user.id,
              chatId: formattedChats[0].id,
              eventType: 'auto_set_document_context',
              component: 'useChatOperations',
              message: `Auto-setting document context from last user message`,
              metadata: { documentIds: lastUserMessage.documentIds }
            });
          }
        }
      }
    } catch (e) {
      await logChatError(
        chatRequestId,
        'useChatOperations',
        'Exception in fetchChats',
        e,
        { userId: user?.id, isGuest }
      );
    } finally {
      setIsInitializing(false);
      
      logChatEvent({
        requestId: chatRequestId,
        userId: user?.id,
        eventType: 'fetch_chats_complete',
        component: 'useChatOperations',
        message: `Chat fetching completed`,
        durationMs: calculateDuration(startTime),
        metadata: { chatCount: chats.length }
      });
    }
  };

  // Create a proper getCurrentChat function that uses the chats state
  const getCurrentChat = () => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  };

  // Function to select a chat
  const selectChat = (chatId: string) => {
    const requestId = generateRequestId();
    
    logChatEvent({
      requestId,
      userId: user?.id,
      chatId,
      eventType: 'select_chat',
      component: 'useChatOperations',
      message: `Selecting chat: ${chatId}`,
      metadata: { previousChatId: currentChatId }
    });
    
    setCurrentChatId(chatId);
    
    // Set document context to the most recent user message with documents
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      const lastUserMessage = [...selectedChat.messages].reverse()
        .find(msg => msg.role === 'user' && msg.documentIds?.length);
        
      if (lastUserMessage?.documentIds) {
        setDocumentContext(lastUserMessage.documentIds);
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'update_document_context',
          component: 'useChatOperations',
          message: `Setting document context from selected chat`,
          metadata: { documentIds: lastUserMessage.documentIds }
        });
      } else {
        // Clear document context if no documents in this chat
        setDocumentContext([]);
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'clear_document_context',
          component: 'useChatOperations',
          message: `Clearing document context - none found in selected chat`
        });
      }
    }
  };

  const { createNewChat } = useChatCreation(user, isGuest, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, isGuest, setChats);

  // Functions to manage document context
  const handleSetDocumentContext = (docIds: string[]) => {
    const requestId = generateRequestId();
    
    logChatEvent({
      requestId,
      userId: user?.id,
      chatId: currentChatId,
      eventType: 'set_document_context',
      component: 'useChatOperations',
      message: `Setting document context: ${docIds.length} documents`,
      metadata: { documentIds: docIds, previousDocumentIds: documentContext }
    });
    
    setDocumentContext(docIds);
  };
  
  const handleGetDocumentContext = () => {
    return documentContext;
  };

  const sendMessage = async (content: string, docIds?: string[]) => {
    const requestId = generateRequestId();
    const startTime = startTimer();
    
    logChatEvent({
      requestId,
      userId: user?.id,
      chatId: currentChatId,
      eventType: 'send_message_started',
      component: 'useChatOperations',
      message: `User sending message`,
      metadata: { 
        contentLength: content.length,
        hasDocIds: !!docIds && docIds.length > 0,
        documentCount: docIds?.length || 0 
      }
    });
    
    if (!user && !isGuest) {
      logChatEvent({
        requestId,
        eventType: 'send_message_auth_error',
        component: 'useChatOperations',
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
        component: 'useChatOperations',
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
        component: 'useChatOperations',
        message: `Creating new chat for message`
      });
      
      chatId = await createNewChat();
      if (!chatId) {
        logChatEvent({
          requestId,
          userId: user?.id,
          eventType: 'create_chat_failed',
          component: 'useChatOperations',
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
        component: 'useChatOperations',
        message: `New chat created with ID: ${chatId}`
      });
    }

    // Use provided document IDs or the document context
    const documentIds = docIds || handleGetDocumentContext();

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
      component: 'useChatOperations',
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
        component: 'useChatOperations',
        message: `Preparing AI request with ${documentIds.length} documents and ${chatMessages.length} messages`,
        metadata: { 
          documentIds,
          messageCount: chatMessages.length
        }
      });
      
      // Fetch document content for context if documentIds are provided
      let documentContents = [];
      if (documentIds.length > 0) {
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'fetch_document_contents_started',
          component: 'useChatOperations',
          message: `Fetching content for ${documentIds.length} documents`
        });
        
        for (const docId of documentIds) {
          try {
            const docStartTime = startTimer();
            
            logChatEvent({
              requestId,
              userId: user?.id,
              chatId,
              eventType: 'fetch_document_content',
              component: 'useChatOperations',
              message: `Fetching document ${docId}`,
              metadata: { documentId: docId }
            });
            
            const { data, error } = await supabase.functions.invoke('drive-integration', {
              body: { operation: 'get', fileId: docId },
            });
            
            if (error) {
              await logChatError(
                requestId,
                'useChatOperations',
                `Error fetching document ${docId}`,
                error,
                { documentId: docId },
                chatId,
                user?.id
              );
              continue;
            }
            
            if (data?.content?.content) {
              documentContents.push({
                id: docId,
                name: data.file.name,
                content: data.content.content,
                processed_at: data.content.processed_at
              });
              
              logChatEvent({
                requestId,
                userId: user?.id,
                chatId,
                eventType: 'document_content_fetched',
                component: 'useChatOperations',
                message: `Document ${docId} fetched successfully`,
                durationMs: calculateDuration(docStartTime),
                metadata: { 
                  documentId: docId,
                  documentName: data.file.name,
                  contentSize: data.content.content.length
                }
              });
            } else {
              logChatEvent({
                requestId,
                userId: user?.id,
                chatId,
                eventType: 'document_content_empty',
                component: 'useChatOperations',
                message: `Document ${docId} has no content`,
                severity: 'warning',
                metadata: { documentId: docId }
              });
            }
          } catch (error) {
            await logChatError(
              requestId,
              'useChatOperations',
              `Exception fetching document ${docId}`,
              error,
              { documentId: docId },
              chatId,
              user?.id
            );
          }
        }
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'fetch_document_contents_completed',
          component: 'useChatOperations',
          message: `Fetched ${documentContents.length}/${documentIds.length} documents successfully`,
          metadata: { 
            successCount: documentContents.length,
            totalCount: documentIds.length
          }
        });
      }

      logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'call_ai_function',
        component: 'useChatOperations',
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
          'useChatOperations',
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
        component: 'useChatOperations',
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
        component: 'useChatOperations',
        message: `Saving AI response to chat`,
        metadata: { messageId: aiResponse.id }
      });
      
      await handleMessageUpdate(chatId, aiResponse, requestId);
      
      logChatEvent({
        requestId,
        userId: user?.id,
        chatId,
        eventType: 'conversation_completed',
        component: 'useChatOperations',
        message: `Conversation cycle completed successfully`,
        durationMs: calculateDuration(startTime)
      });
    } catch (error) {
      await logChatError(
        requestId,
        'useChatOperations',
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
        component: 'useChatOperations',
        message: `Saving error message to chat`,
        metadata: { messageId: errorMessage.id }
      });
      
      await handleMessageUpdate(chatId, errorMessage, requestId);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  return {
    currentChatId,
    isLoadingResponse,
    createNewChat,
    sendMessage,
    getCurrentChat,
    chats,
    selectChat,
    isInitializing,
    setDocumentContext: handleSetDocumentContext,
    getDocumentContext: handleGetDocumentContext
  };
};
