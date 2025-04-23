
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Chat } from "../types/chat";
import { User } from "@supabase/supabase-js";

export const useChatCreation = (
  user: User | null,
  isGuest: boolean,
  setChats: (chats: Chat[] | ((prev: Chat[]) => Chat[])) => void,
  setCurrentChatId: (id: string | null) => void
) => {
  const createNewChat = async () => {
    if (!user && !isGuest) {
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
      setCurrentChatId(newChat.id);
      return newChat.id;
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: "New Chat"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create chat");
      return null;
    }

    const newChat: Chat = {
      id: chat.id,
      title: chat.title,
      messages: [],
      createdAt: new Date(chat.created_at).getTime(),
      updatedAt: new Date(chat.updated_at).getTime(),
    };

    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  return { createNewChat };
};
