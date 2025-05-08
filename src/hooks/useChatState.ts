
import { useState } from "react";
import { Chat } from "../types/chat";
import { logEvent } from "../utils/logging";

export const useChatState = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const getCurrentChat = () => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  };

  return {
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    isInitializing,
    setIsInitializing,
    getCurrentChat
  };
};
