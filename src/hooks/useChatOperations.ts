
import { useAuth } from "@/contexts/AuthContext";
import { useChatState } from "./useChatState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { useChatFetching } from "./useChatFetching";
import { useChatSelection } from "./useChatSelection";
import { useChatSending } from "./useChatSending";
import { useChatDocuments } from "./useChatDocuments";
import { toast } from "@/components/ui/sonner";

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
  const { 
    documentContext, 
    setDocumentContext, 
    getDocumentContext, 
    fetchDocumentContents,
    isFetching 
  } = useChatDocuments();
  
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

  // Custom wrapper for the setDocumentContext function that includes some validation
  const updateDocumentContext = (docIds: string[]) => {
    if (!Array.isArray(docIds)) {
      console.error("Invalid document IDs provided:", docIds);
      toast.error("Invalid document selection");
      return;
    }
    
    // Filter out any non-string IDs
    const validIds = docIds.filter(id => typeof id === 'string');
    if (validIds.length !== docIds.length) {
      console.warn("Some document IDs were filtered out:", docIds);
    }
    
    // Update the context
    setDocumentContext(validIds);
  };

  return {
    currentChatId,
    isLoadingResponse,
    createNewChat,
    sendMessage,
    getCurrentChat,
    chats,
    selectChat,
    isInitializing,
    setDocumentContext: updateDocumentContext,
    getDocumentContext,
    isFetchingDocuments: isFetching
  };
};
