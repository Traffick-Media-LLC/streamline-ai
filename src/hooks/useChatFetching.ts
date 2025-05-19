
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Chat, Message } from "@/types/chat";
import { ErrorTracker } from "@/utils/logging";

export const useChatFetching = (
  user, 
  setChats, 
  setCurrentChatId, 
  currentChatId, 
  setIsInitializing
) => {
  // Function to fetch chats from API
  const fetchChats = async () => {
    try {
      setIsInitializing(true);
      const errorTracker = new ErrorTracker('useChatFetching', user?.id);
      
      if (user) {
        await errorTracker.logStage('fetch_chats', 'start');
        
        // Get chats for this user ordered by most recent
        const { data, error } = await supabase
          .from('chats')
          .select()
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
          
        if (error) {
          await errorTracker.logError('Error fetching chats', error);
          throw error;
        }
        
        // Transform data to match Chat type
        const transformedChats = await Promise.all(data.map(async chat => {
          // Get messages for this chat
          const { data: messagesData, error: messagesError } = await supabase
            .from('chat_messages')
            .select()
            .eq('chat_id', chat.id)
            .order('timestamp', { ascending: true });
            
          if (messagesError) {
            await errorTracker.logError(`Error fetching messages for chat ${chat.id}`, messagesError);
            return {
              id: chat.id,
              title: chat.title || 'Untitled Chat',
              messages: [],
              createdAt: new Date(chat.created_at).toISOString(),
              updatedAt: new Date(chat.updated_at).toISOString()
            } as Chat;
          }
          
          // Transform messages
          const messages = messagesData.map(msg => {
            // Parse document_ids if available
            let metadata = undefined;
            
            try {
              // Handle JSON content or fields that might contain metadata
              if (msg.document_ids && msg.document_ids.length > 0) {
                metadata = { documentIds: msg.document_ids };
              }
            } catch (e) {
              console.error('Error parsing message metadata:', e);
            }
            
            const message: Message = {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              createdAt: new Date(msg.timestamp).toISOString(),
              timestamp: new Date(msg.timestamp).getTime()
            };
            
            if (metadata) {
              message.metadata = metadata;
            }
            
            return message;
          });
          
          const chatObj: Chat = {
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            messages,
            createdAt: new Date(chat.created_at).toISOString(),
            updatedAt: new Date(chat.updated_at).toISOString()
          };
          
          return chatObj;
        }));
        
        // Set chats in state
        setChats(transformedChats);
        
        // If currentChatId is already set but not in the chats, reset it
        if (currentChatId && !transformedChats.some(chat => chat.id === currentChatId)) {
          setCurrentChatId(transformedChats.length > 0 ? transformedChats[0].id : null);
        } 
        // If no current chat but we have chats, set the most recent one
        else if (!currentChatId && transformedChats.length > 0) {
          setCurrentChatId(transformedChats[0].id);
        }
        
        await errorTracker.logStage('fetch_chats', 'complete', {
          chatCount: transformedChats.length
        });
      } else {
        // No user yet (not logged in)
        setChats([]);
        setCurrentChatId(null);
      }
      
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setIsInitializing(false);
    }
  };
  
  // Fetch chats on initial mount and when user changes
  useEffect(() => {
    fetchChats();
  }, [user?.id]);
  
  return { fetchChats };
};
