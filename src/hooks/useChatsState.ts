
import { useState } from "react";
import { Chat } from "../types/chat";

export const useChatsState = () => {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [mode, setMode] = useState<"simple" | "complex">("simple");

  const getCurrentChat = () => null;

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
