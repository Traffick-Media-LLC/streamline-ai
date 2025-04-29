
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Message } from "../types/chat";
import { User } from "@supabase/supabase-js";
import { logChatEvent, logChatError, startTimer, calculateDuration } from "../utils/chatLogging";

export const useMessageOperations = (
  user: User | null,
  isGuest: boolean,
  setChats: (chats: any[] | ((prev: any[]) => any[])) => void
) => {
  const handleMessageUpdate = async (
    chatId: string, 
    message: Message, 
    requestId?: string
  ) => {
    const startTime = startTimer();
    
    if (!isGuest && user) {
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
            logChatEvent({
              requestId: requestId || 'unknown',
              userId: user.id,
              chatId,
              eventType: 'fetch_profile_error',
              component: 'useMessageOperations',
              message: `Error fetching user profile: ${profileError.message}`,
              severity: 'warning',
              metadata: { messageRole: message.role }
            });
          } else {
            // Add the user's name to assistant messages if available
            if (profile?.first_name) {
              message.content = message.content.replace(/^/, `${profile.first_name}, `);
              
              logChatEvent({
                requestId: requestId || 'unknown',
                userId: user.id,
                chatId,
                eventType: 'personalize_message',
                component: 'useMessageOperations',
                message: `Added personalization to assistant message`,
                metadata: { firstName: profile.first_name }
              });
            }
          }
        }

        logChatEvent({
          requestId: requestId || 'unknown',
          userId: user.id,
          chatId,
          eventType: 'save_message_db',
          component: 'useMessageOperations',
          message: `Saving ${message.role} message to database`,
          metadata: { 
            messageId: message.id, 
            messageRole: message.role,
            hasDocumentIds: !!message.documentIds && message.documentIds.length > 0
          }
        });
        
        const dbStartTime = startTimer();
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: chatId,
            role: message.role,
            content: message.content,
            document_ids: message.documentIds || [] // Include document_ids in the insert
          });

        if (error) {
          await logChatError(
            requestId || 'unknown',
            'useMessageOperations',
            "Error saving message to database",
            error,
            { chatId, messageId: message.id },
            chatId,
            user.id
          );
          toast.error("Failed to save message");
          return;
        }
        
        logChatEvent({
          requestId: requestId || 'unknown',
          userId: user.id,
          chatId,
          eventType: 'save_message_db_success',
          component: 'useMessageOperations',
          message: `Successfully saved message to database`,
          durationMs: calculateDuration(dbStartTime)
        });
      } catch (e) {
        await logChatError(
          requestId || 'unknown',
          'useMessageOperations',
          "Exception saving message",
          e,
          { chatId, messageId: message.id },
          chatId,
          user.id
        );
      }
    } else if (isGuest) {
      // For guest users, we need to update local storage after updating the state
      logChatEvent({
        requestId: requestId || 'unknown',
        chatId,
        eventType: 'update_guest_message_state',
        component: 'useMessageOperations',
        message: `Updating guest chat message state`,
        metadata: { messageRole: message.role }
      });
    }

    // Update React state
    setChats(prev => {
      const updatedChats = prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            updatedAt: Date.now(),
          };
        }
        return chat;
      });
      
      // For guest users, update localStorage
      if (isGuest) {
        localStorage.setItem('guestChats', JSON.stringify(updatedChats));
        
        logChatEvent({
          requestId: requestId || 'unknown',
          chatId,
          eventType: 'update_guest_localstorage',
          component: 'useMessageOperations',
          message: `Updated guest chats in localStorage`,
          metadata: { chatCount: updatedChats.length }
        });
      }
      
      return updatedChats;
    });
    
    logChatEvent({
      requestId: requestId || 'unknown',
      userId: user?.id,
      chatId,
      eventType: 'message_update_complete',
      component: 'useMessageOperations',
      message: `Message update completed successfully`,
      durationMs: calculateDuration(startTime),
      metadata: { messageRole: message.role }
    });
  };

  return { handleMessageUpdate };
};
