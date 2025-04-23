
import { useState } from "react";
import { Chat } from "../types/chat";

export const useChatsState = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [mode, setMode] = useState<"simple" | "complex">("simple");

  // This function needs to work with the chats from useChatOperations
  const getCurrentChat = () => {
    // We can't directly access chats here since they're managed in useChatOperations
    // This will be replaced with a proper implementation in useChatOperations
    return null;
  };

  return {
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    mode,
    setMode,
    getCurrentChat,
  };
};
