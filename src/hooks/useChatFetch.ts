
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Chat, Message } from "../types/chat";
import { User } from "@supabase/supabase-js";

export const useChatFetch = (
  user: User | null,
  setChats: (chats: Chat[]) => void,
  setCurrentChatId: (id: string | null) => void,
  currentChatId: string | null
) => {
  const fetchChats = async () => {
    if (!user) return;

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
          timestamp
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
      return;
    }

    const formattedChats = data.map(chat => {
      const messages = chat.chat_messages.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        createdAt: new Date(msg.timestamp).toISOString(),
        timestamp: new Date(msg.timestamp).getTime()
      }));

      return {
        id: chat.id,
        title: chat.title,
        messages: messages,
        createdAt: new Date(chat.created_at).toISOString(),
        updatedAt: new Date(chat.updated_at).toISOString()
      } as Chat;
    });

    setChats(formattedChats);
    if (formattedChats.length > 0 && !currentChatId) {
      setCurrentChatId(formattedChats[0].id);
    }
  };

  return { fetchChats };
};
