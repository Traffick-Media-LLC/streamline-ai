
import { useAuth } from "@/contexts/AuthContext";
import { useChatState } from "./useChatState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { useChatFetching } from "./useChatFetching";
import { useChatSelection } from "./useChatSelection";
import { useChatSending } from "./useChatSending";
import { useChatDocuments } from "./useChatDocuments";

export const useChatOperations = () => {
  const { user, isGuest } = useAuth();
  const {
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    isInitializing,
    setIsInitializing,
    getCurrentChat
  } = useChatState();
  
  const { createNewChat } = useChatCreation(user, isGuest, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, isGuest, setChats);
  const { documentContext, setDocumentContext, getDocumentContext, fetchDocumentContents } = useChatDocuments();
  const { fetchChats } = useChatFetching(
    user, 
    isGuest, 
    setChats, 
    setCurrentChatId, 
    currentChatId, 
    setIsInitializing, 
    setDocumentContext
  );
  const { selectChat } = useChatSelection(user, currentChatId, setCurrentChatId, chats, setDocumentContext);
  const { sendMessage } = useChatSending(
    user,
    isGuest,
    currentChatId,
    createNewChat,
    handleMessageUpdate,
    setIsLoadingResponse,
    getCurrentChat,
    getDocumentContext,
    fetchDocumentContents
  );

  return {
    currentChatId,
    isLoadingResponse,
    createNewChat,
    sendMessage,
    getCurrentChat,
    chats,
    selectChat,
    isInitializing,
    setDocumentContext,
    getDocumentContext
  };
};
