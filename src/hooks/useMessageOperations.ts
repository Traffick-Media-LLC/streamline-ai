
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Message } from "../types/chat";
import { User } from "@supabase/supabase-js";

export const useMessageOperations = (
  user: User | null,
  isGuest: boolean,
  setChats: (chats: any[] | ((prev: any[]) => any[])) => void
) => {
  const handleMessageUpdate = async (chatId: string, message: Message) => {
    if (!isGuest && user) {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          role: message.role,
          content: message.content
        });

      if (error) {
        console.error("Error saving message:", error);
        toast.error("Failed to save message");
        return;
      }
    }

    setChats(prev =>
      prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );
  };

  return { handleMessageUpdate };
};
