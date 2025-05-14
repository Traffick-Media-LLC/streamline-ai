
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Chat } from "../types/chat";
import { User } from "@supabase/supabase-js";
import { ErrorTracker, startTimer, calculateDuration } from "@/utils/logging";

export const useChatCreation = (
  user: User | null,
  setChats: (chats: Chat[] | ((prev: Chat[]) => Chat[])) => void,
  setCurrentChatId: (id: string | null) => void
) => {
  const createNewChat = async () => {
    const errorTracker = new ErrorTracker('useChatCreation', user?.id);
    const startTime = startTimer();
    
    await errorTracker.logStage('create_chat', 'start');
    
    if (!user) {
      await errorTracker.logStage('create_chat', 'error', {
        reason: 'unauthorized'
      });
      
      toast.error("Please sign in to create a chat");
      return null;
    }

    try {
      await errorTracker.logStage('create_db_chat', 'start', {
        userId: user.id
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
        await errorTracker.logError(
          "Error creating chat in database",
          error, 
          { userId: user.id }
        );
        
        toast.error("Failed to create chat");
        return null;
      }

      await errorTracker.logStage('create_db_chat', 'complete', { 
        chatId: chat.id,
        durationMs: calculateDuration(dbStartTime)
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

      await errorTracker.logStage('create_chat', 'complete', {
        chatId: chat.id,
        durationMs: calculateDuration(startTime)
      });
      
      return newChat.id;
    } catch (e) {
      await errorTracker.logError(
        "Exception creating chat",
        e,
        { userId: user?.id }
      );
      
      toast.error("Failed to create chat");
      return null;
    }
  };

  return { createNewChat };
};
