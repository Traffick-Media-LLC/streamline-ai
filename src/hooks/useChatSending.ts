
import { User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from 'uuid';
import { Message } from "@/types/chat";
import { generateRequestId, ErrorTracker, startTimer, calculateDuration } from "@/utils/logging";

export const useChatSending = (
  user: User | null,
  currentChatId: string | null,
  createNewChat: () => Promise<string | null>,
  handleMessageUpdate: (chatId: string, message: Message, requestId?: string) => Promise<void>,
  setIsLoadingResponse: (loading: boolean) => void,
  getCurrentChat: () => any
) => {
  const sendMessage = async (content: string) => {
    const requestId = generateRequestId();
    const errorTracker = new ErrorTracker('useChatSending', user?.id, currentChatId || undefined, requestId);
    const startTime = startTimer();

    try {
      await errorTracker.logStage('send_message', 'start');
      
      if (!user) {
        await errorTracker.logStage('send_message', 'error', { reason: 'unauthorized' });
        return { success: false, error: 'Authentication required' };
      }

      const now = new Date().toISOString();
      const userMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content,
        createdAt: now
      };

      // Create a new chat if needed
      let activeChatId = currentChatId;
      
      if (!activeChatId) {
        await errorTracker.logStage('create_new_chat', 'start');
        activeChatId = await createNewChat();
        
        if (!activeChatId) {
          await errorTracker.logStage('send_message', 'error', { reason: 'failed_to_create_chat' });
          return { success: false, error: 'Failed to create chat' };
        }
        
        await errorTracker.logStage('create_new_chat', 'complete', { chatId: activeChatId });
      }

      // Add user message to chat
      await errorTracker.logStage('add_user_message', 'start');
      await handleMessageUpdate(activeChatId, userMessage, requestId);
      await errorTracker.logStage('add_user_message', 'complete');

      // Set loading state for UI
      setIsLoadingResponse(true);
      
      try {
        // Get current chat context
        const currentChat = getCurrentChat();
        const messages = currentChat?.messages || [];
        
        // Generate AI response
        await errorTracker.logStage('generate_response', 'start');
        
        const generationStartTime = startTimer();
        const response = "This is a mock response. In a real app, this would come from an API call.";
        
        await errorTracker.logStage('generate_response', 'complete', {
          durationMs: calculateDuration(generationStartTime)
        });

        // Add assistant message to chat
        const assistantMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response,
          createdAt: new Date().toISOString()
        };
        
        await errorTracker.logStage('add_assistant_message', 'start');
        await handleMessageUpdate(activeChatId, assistantMessage, requestId);
        await errorTracker.logStage('add_assistant_message', 'complete');
        
        await errorTracker.logStage('send_message', 'complete', {
          durationMs: calculateDuration(startTime),
          userMessageLength: content.length,
          aiResponseLength: response.length
        });

        return { success: true };
        
      } catch (error) {
        await errorTracker.logError('Error generating response', error);
        return { success: false, error: 'Failed to generate response' };
      } finally {
        setIsLoadingResponse(false);
      }
      
    } catch (error) {
      await errorTracker.logError('Error in sendMessage', error);
      setIsLoadingResponse(false);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  return { sendMessage };
};
