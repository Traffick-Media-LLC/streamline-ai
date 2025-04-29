
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "@/components/ui/sonner";
import { Chat } from "../types/chat";
import { generateRequestId, logChatEvent, logChatError, startTimer, calculateDuration } from "../utils/chatLogging";

export const useChatFetching = (
  user: User | null,
  isGuest: boolean,
  setChats: (chats: Chat[]) => void,
  setCurrentChatId: (id: string | null) => void,
  currentChatId: string | null,
  setIsInitializing: (isInitializing: boolean) => void,
  setDocumentContext: (docIds: string[]) => void
) => {
  // Fetch chats when user changes
  useEffect(() => {
    const requestId = generateRequestId();
    logChatEvent({
      requestId,
      userId: user?.id,
      eventType: 'auth_state_change',
      component: 'useChatFetching',
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
      component: 'useChatFetching',
      message: `Fetching chats - user authenticated: ${!!user}, is guest: ${isGuest}`,
      metadata: { isAuthenticated: !!user, isGuest }
    });
    
    if (!user && !isGuest) {
      logChatEvent({
        requestId: chatRequestId,
        eventType: 'fetch_chats_skipped',
        component: 'useChatFetching',
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
          component: 'useChatFetching',
          message: 'Loading guest chats from local storage'
        });
        
        const storedChats = localStorage.getItem('guestChats');
        if (storedChats) {
          const parsedChats = JSON.parse(storedChats);
          setChats(parsedChats);
          
          logChatEvent({
            requestId: chatRequestId,
            eventType: 'fetch_guest_chats_completed',
            component: 'useChatFetching',
            message: 'Guest chats loaded successfully',
            durationMs: calculateDuration(startTime),
            metadata: { chatCount: parsedChats.length }
          });
        } else {
          logChatEvent({
            requestId: chatRequestId,
            eventType: 'fetch_guest_chats_empty',
            component: 'useChatFetching',
            message: 'No stored guest chats found',
            durationMs: calculateDuration(startTime)
          });
          setChats([]);
        }
      } else {
        // For authenticated users, fetch from Supabase
        logChatEvent({
          requestId: chatRequestId,
          userId: user?.id,
          eventType: 'fetch_db_chats_started',
          component: 'useChatFetching',
          message: `Fetching chats for authenticated user: ${user?.id}`
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
          .eq('user_id', user?.id)
          .order('updated_at', { ascending: false });

        if (error) {
          await logChatError(
            chatRequestId,
            'useChatFetching',
            'Error fetching chats from database',
            error,
            { userId: user?.id },
            null,
            user?.id
          );
          toast.error("Failed to load chats");
          return;
        }

        logChatEvent({
          requestId: chatRequestId,
          userId: user?.id,
          eventType: 'fetch_db_chats_completed',
          component: 'useChatFetching',
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
            userId: user?.id,
            eventType: 'auto_select_chat',
            component: 'useChatFetching',
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
              userId: user?.id,
              chatId: formattedChats[0].id,
              eventType: 'auto_set_document_context',
              component: 'useChatFetching',
              message: `Auto-setting document context from last user message`,
              metadata: { documentIds: lastUserMessage.documentIds }
            });
          }
        }
      }
    } catch (e) {
      await logChatError(
        chatRequestId,
        'useChatFetching',
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
        component: 'useChatFetching',
        message: `Chat fetching completed`,
        durationMs: calculateDuration(startTime)
      });
    }
  };

  return { fetchChats };
};
