
import { createContext, useContext } from "react";
import { ChatContextType } from "../types/chatContext";
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
    chats,
    selectChat,
    isInitializing
  } = useChatOperations();

  const value: ChatContextType = {
    currentChatId,
    isLoadingResponse,
    mode,
    createNewChat,
    sendMessage,
    getCurrentChat,
    setMode,
    chats,
    selectChat,
    isInitializing
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
