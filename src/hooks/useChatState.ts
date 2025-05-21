
import { useState, useCallback } from "react";
import { Chat, Message } from "../types/chat";
import { logEvent } from "../utils/logging";

export const useChatState = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Get current chat with safety checks
  const getCurrentChat = useCallback(() => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [currentChatId, chats]);
  
  // Add message to chat with proper state update
  const addMessageToChat = useCallback((chatId: string, message: Message) => {
    console.log("Adding message to chat:", chatId, message);
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, message],
            updatedAt: new Date().toISOString()
          };
        }
        return chat;
      });
      
      return updatedChats;
    });
  }, []);
  
  // Clear chat state
  const clearChat = useCallback(() => {
    setCurrentChatId(null);
  }, []);

  return {
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    isInitializing,
    setIsInitializing,
    getCurrentChat,
    clearChat,
    addMessageToChat
  };
};
