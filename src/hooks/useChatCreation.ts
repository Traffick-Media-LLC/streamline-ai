
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Chat } from "../types/chat";
import { User } from "@supabase/supabase-js";
import { generateChatTitle } from "../utils/chatUtils";

export const useChatCreation = (
  user: User | null,
  isGuest: boolean,
  setChats: (chats: Chat[]) => void,
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
      setChats(prev => [newChat, ...prev]);
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

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const updateChatTitle = async (chatId: string, firstMessage: string) => {
    const title = await generateChatTitle(firstMessage);
    
    if (!isGuest && user) {
      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId);

      if (error) {
        console.error("Error updating chat title:", error);
        return;
      }
    }

    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, title } : chat
      )
    );
  };

  return { createNewChat, updateChatTitle };
};
