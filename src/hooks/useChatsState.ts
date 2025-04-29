import { useState } from "react";

export const useChatsState = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);

  // This is just a placeholder that will be replaced by the actual implementation in useChatOperations
  const getCurrentChat = () => null;

  return {
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    getCurrentChat,
  };
};
