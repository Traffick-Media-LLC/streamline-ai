
import { createContext, useContext, useEffect } from "react";
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
    chats,
    currentChatId,
    isLoadingResponse,
    mode,
    fetchChats,
    createNewChat,
    selectChat,
    sendMessage,
    getCurrentChat,
    setMode,
  } = useChatOperations();

  useEffect(() => {
    fetchChats();
  }, []);

  const value = {
    chats,
    currentChatId,
    isLoadingResponse,
    mode,
    createNewChat,
    selectChat,
    sendMessage,
    getCurrentChat,
    setMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
