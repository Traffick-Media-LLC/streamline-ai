
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Message } from "../types/chat";
import { User } from "@supabase/supabase-js";
import { generateRequestId, ErrorTracker, startTimer, calculateDuration } from "@/utils/logging";

export const useMessageOperations = (
  user: User | null,
  setChats: (chats: any[] | ((prev: any[]) => any[])) => void
) => {
  const handleMessageUpdate = async (
    chatId: string, 
    message: Message, 
    requestId?: string
  ) => {
    const operationRequestId = requestId || generateRequestId();
    const errorTracker = new ErrorTracker('useMessageOperations', user?.id, chatId, operationRequestId);
    const startTime = startTimer();
    
    try {
      await errorTracker.logStage('message_update', 'start', {
        messageRole: message.role,
        messageId: message.id
      });

      if (user) {
        // If it's an authenticated user, store in database
        try {
          // If it's an assistant message, get the user's first name first
          if (message.role === 'assistant') {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('first_name')
              .eq('id', user.id)
              .single();

            if (profileError) {
              await errorTracker.logError(
                `Error fetching user profile: ${profileError.message}`,
                profileError,
                { messageRole: message.role }
              );
            } else {
              // Add the user's name to assistant messages if available
              if (profile?.first_name) {
                message.content = message.content.replace(/^/, `${profile.first_name}, `);
                
                await errorTracker.logStage('personalize_message', 'complete', {
                  firstName: profile.first_name
                });
              }
            }
          }

          await errorTracker.logStage('save_message_db', 'start', { 
            messageId: message.id, 
            messageRole: message.role
          });
          
          const dbStartTime = startTimer();
          const { error } = await supabase
            .from('chat_messages')
            .insert({
              chat_id: chatId,
              role: message.role,
              content: message.content
            });

          if (error) {
            await errorTracker.logError("Error saving message to database", error, {
              chatId,
              messageId: message.id
            });
            toast.error("Failed to save message");
            return;
          }
          
          await errorTracker.logStage('save_message_db', 'complete', {
            durationMs: calculateDuration(dbStartTime)
          });
        } catch (e) {
          await errorTracker.logError("Exception saving message", e, {
            chatId,
            messageId: message.id
          });
        }
      }

      // REMOVED: No longer updating React state here since it's now handled exclusively in useChatSending
      
      await errorTracker.logStage('message_update', 'complete', {
        durationMs: calculateDuration(startTime),
        messageRole: message.role
      });

    } catch (error) {
      await errorTracker.logError(
        "Error in handleMessageUpdate",
        error,
        { messageId: message.id, messageRole: message.role }
      );
    }
  };

  return { handleMessageUpdate };
};
