
import { generateRequestId, logChatEvent } from "../utils/chatLogging";
import { Chat } from "../types/chat";
import { User } from "@supabase/supabase-js";

export const useChatSelection = (
  user: User | null,
  currentChatId: string | null,
  setCurrentChatId: (id: string | null) => void,
  chats: Chat[],
  setDocumentContext: (docIds: string[]) => void
) => {
  // Function to select a chat
  const selectChat = (chatId: string) => {
    const requestId = generateRequestId();
    
    logChatEvent({
      requestId,
      userId: user?.id,
      chatId,
      eventType: 'select_chat',
      component: 'useChatSelection',
      message: `Selecting chat: ${chatId}`,
      metadata: { previousChatId: currentChatId }
    });
    
    setCurrentChatId(chatId);
    
    // Set document context to the most recent user message with documents
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      const lastUserMessage = [...selectedChat.messages].reverse()
        .find(msg => msg.role === 'user' && msg.documentIds?.length);
        
      if (lastUserMessage?.documentIds) {
        setDocumentContext(lastUserMessage.documentIds);
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'update_document_context',
          component: 'useChatSelection',
          message: `Setting document context from selected chat`,
          metadata: { documentIds: lastUserMessage.documentIds }
        });
      } else {
        // Clear document context if no documents in this chat
        setDocumentContext([]);
        
        logChatEvent({
          requestId,
          userId: user?.id,
          chatId,
          eventType: 'clear_document_context',
          component: 'useChatSelection',
          message: `Clearing document context - none found in selected chat`
        });
      }
    }
  };

  return { selectChat };
};
