
import { useAuth } from "@/contexts/AuthContext";
import { useChatState } from "./useChatState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { useChatFetching } from "./useChatFetching";
import { useChatSelection } from "./useChatSelection";
import { useChatSending } from "./useChatSending";
import { generateRequestId, ErrorTracker } from "@/utils/logging";

export const useChatOperations = () => {
  const { user } = useAuth();
  const {
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
  } = useChatState();
  
  const { createNewChat } = useChatCreation(user, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, setChats);
  
  const { fetchChats } = useChatFetching(
    user, 
    setChats, 
    setCurrentChatId, 
    currentChatId, 
    setIsInitializing
  );
  
  const { selectChat } = useChatSelection(user, currentChatId, setCurrentChatId, chats);
  
  const { sendMessage } = useChatSending(
    user,
    currentChatId,
    createNewChat,
    handleMessageUpdate,
    setIsLoadingResponse,
    getCurrentChat,
    addMessageToChat
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
    clearChat,
    fetchChats  // Make sure to include fetchChats in the returned object
  };
};
