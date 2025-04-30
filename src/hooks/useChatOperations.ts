
import { useAuth } from "@/contexts/AuthContext";
import { useChatState } from "./useChatState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { useChatFetching } from "./useChatFetching";
import { useChatSelection } from "./useChatSelection";
import { useChatSending } from "./useChatSending";
import { useChatDocuments } from "./useChatDocuments";
import { toast } from "@/components/ui/sonner";
import { useState } from "react";

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
  
  // Add state for shared drive ID
  const [sharedDriveId, setSharedDriveId] = useState<string | undefined>(
    () => Deno.env.get("GOOGLE_SHARED_DRIVE_ID") || undefined
  );
  
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

  // Helper function to show appropriate Google Drive setup instructions
  const showDriveSetupInstructions = () => {
    toast.info(
      "To use Google Drive documents with this chat, you need to:",
      { duration: 8000 }
    );
    
    setTimeout(() => {
      toast.info(
        "1. Make sure the Google Drive API is enabled for your project",
        { duration: 8000 }
      );
    }, 500);
    
    setTimeout(() => {
      toast.info(
        "2. Share files directly with the service account email address",
        { duration: 8000 }
      );
    }, 1000);
    
    setTimeout(() => {
      toast.info(
        "3. Verify the service account has the necessary Drive permissions",
        { duration: 8000 }
      );
    }, 1500);
    
    // Add new instruction specific to Shared Drives
    setTimeout(() => {
      toast.info(
        "4. For Shared Drives, add the GOOGLE_SHARED_DRIVE_ID in your Supabase secrets",
        { duration: 8000 }
      );
    }, 2000);
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
    isFetchingDocuments: isFetching,
    showDriveSetupInstructions,
    sharedDriveId,
    setSharedDriveId
  };
};
