
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Chat } from "../types/chat";
import { User } from "@supabase/supabase-js";
import { logChatEvent, logChatError, startTimer, calculateDuration, generateRequestId } from "../utils/chatLogging";

export const useChatCreation = (
  user: User | null,
  isGuest: boolean,
  setChats: (chats: Chat[] | ((prev: Chat[]) => Chat[])) => void,
  setCurrentChatId: (id: string | null) => void
) => {
  const createNewChat = async () => {
    const requestId = generateRequestId();
    const startTime = startTimer();
    
    logChatEvent({
      requestId,
      userId: user?.id,
      eventType: 'create_chat_started',
      component: 'useChatCreation',
      message: `Creating new chat`,
      metadata: { isGuest }
    });
    
    if (!user && !isGuest) {
      logChatEvent({
        requestId,
        eventType: 'create_chat_auth_error',
        component: 'useChatCreation',
        message: `Unauthorized chat creation attempt`,
        severity: 'warning'
      });
      
      toast.error("Please sign in to create a chat");
      return null;
    }

    if (isGuest) {
      const newChat: Chat = {
        id: `guest-${Date.now()}`,
        title: "New Chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      logChatEvent({
        requestId,
        chatId: newChat.id,
        eventType: 'create_guest_chat',
        component: 'useChatCreation',
        message: `Created new guest chat with ID: ${newChat.id}`
      });
      
      // Update state
      setChats(prevChats => {
        const updatedChats = [newChat, ...prevChats];
        
        // Save to localStorage for guests
        localStorage.setItem('guestChats', JSON.stringify(updatedChats));
        
        logChatEvent({
          requestId,
          chatId: newChat.id,
          eventType: 'update_guest_storage',
          component: 'useChatCreation',
          message: `Updated guest chats in localStorage`,
          metadata: { chatCount: updatedChats.length }
        });
        
        return updatedChats;
      });
      
      setCurrentChatId(newChat.id);
      
      logChatEvent({
        requestId,
        chatId: newChat.id,
        eventType: 'create_chat_completed',
        component: 'useChatCreation',
        message: `Guest chat creation completed`,
        durationMs: calculateDuration(startTime)
      });
      
      return newChat.id;
    }

    try {
      logChatEvent({
        requestId,
        userId: user.id,
        eventType: 'create_db_chat',
        component: 'useChatCreation',
        message: `Creating chat in database for user ${user.id}`
      });
      
      const dbStartTime = startTimer();
      const { data: chat, error } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          title: "New Chat"
        })
        .select()
        .single();

      if (error) {
        await logChatError(
          requestId,
          'useChatCreation',
          "Error creating chat in database",
          error,
          { userId: user.id },
          null,
          user.id
        );
        
        toast.error("Failed to create chat");
        return null;
      }

      logChatEvent({
        requestId,
        userId: user.id,
        chatId: chat.id,
        eventType: 'create_db_chat_success',
        component: 'useChatCreation',
        message: `Successfully created chat in database`,
        durationMs: calculateDuration(dbStartTime),
        metadata: { chatId: chat.id }
      });

      const newChat: Chat = {
        id: chat.id,
        title: chat.title,
        messages: [],
        createdAt: new Date(chat.created_at).getTime(),
        updatedAt: new Date(chat.updated_at).getTime(),
      };
      
      // Update state
      setChats(prevChats => [newChat, ...prevChats]);
      setCurrentChatId(newChat.id);

      logChatEvent({
        requestId,
        userId: user.id,
        chatId: chat.id,
        eventType: 'create_chat_completed',
        component: 'useChatCreation',
        message: `Chat creation completed`,
        durationMs: calculateDuration(startTime)
      });
      
      return newChat.id;
    } catch (e) {
      await logChatError(
        requestId,
        'useChatCreation',
        "Exception creating chat",
        e,
        { userId: user?.id },
        null,
        user?.id
      );
      
      toast.error("Failed to create chat");
      return null;
    }
  };

  return { createNewChat };
};
