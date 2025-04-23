
import { createContext, useContext, useEffect } from "react";
import { ChatContextType } from "../types/chat";
import { useChatOperations } from "../hooks/useChatOperations";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    currentChatId,
    isLoadingResponse,
    mode,
    createNewChat,
    sendMessage,
    getCurrentChat,
    setMode,
  } = useChatOperations();

  const value = {
    currentChatId,
    isLoadingResponse,
    mode,
    createNewChat,
    sendMessage,
    getCurrentChat,
    setMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
