
import { useEffect } from "react";

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
      
      if (user) {
        // Handle authenticated user flow (API)
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Get chats for this user ordered by most recent
        const { data, error } = await supabase
          .from('chats')
          .select()
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
          
        if (error) {
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
            console.error(`Error fetching messages for chat ${chat.id}:`, messagesError);
            return {
              id: chat.id,
              title: chat.title || 'Untitled Chat',
              messages: [],
              createdAt: new Date(chat.created_at).getTime(),
              updatedAt: new Date(chat.updated_at).getTime()
            };
          }
          
          // Transform messages
          const messages = messagesData.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime()
          }));
          
          return {
            id: chat.id,
            title: chat.title || 'Untitled Chat',
            messages,
            createdAt: new Date(chat.created_at).getTime(),
            updatedAt: new Date(chat.updated_at).getTime()
          };
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
