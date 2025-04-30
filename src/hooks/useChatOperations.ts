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
import { generateRequestId } from "../utils/chatLogging";

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
  
  // Add state for shared drive ID using environment variable
  // Use import.meta.env instead of Deno.env
  const [sharedDriveId, setSharedDriveId] = useState<string | undefined>(
    () => import.meta.env.VITE_GOOGLE_SHARED_DRIVE_ID || undefined
  );
  
  const { createNewChat } = useChatCreation(user, isGuest, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, isGuest, setChats);
  const { 
    documentContext, 
    setDocumentContext, 
    getDocumentContext, 
    fetchDocumentContents,
    searchDocuments,
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

  // New function to handle direct file searches
  const searchDriveFiles = async (query: string) => {
    if (!query || query.trim() === '') {
      toast.error("Please enter a search term");
      return;
    }
    
    // Generate a unique request ID for this search operation
    const requestId = generateRequestId();
    
    try {
      // Show loading toast
      toast.loading(`Searching for "${query}"...`, { id: requestId });
      
      // Perform the search
      const results = await searchDocuments(query, user?.id, currentChatId || undefined, requestId);
      
      toast.dismiss(requestId);
      
      if (results.length === 0) {
        toast.info(`No files found for "${query}"`);
        return;
      }
      
      // Create a message that contains the file search results
      const filesMessage = `I found ${results.length} file${results.length > 1 ? 's' : ''} matching "${query}":\n\n` +
        results.slice(0, 5).map((file, index) => {
          return `${index + 1}. ${file.name} - ${file.webLink || 'No link available'}`;
        }).join('\n\n');
      
      // Send the search results as a message in the chat
      await sendMessage(filesMessage, results.map(file => file.id));
      
    } catch (error) {
      toast.dismiss(requestId);
      toast.error(`Error searching for files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update the showDriveSetupInstructions function to be more informative
  const showDriveSetupInstructions = () => {
    toast.info(
      "To use Google Drive documents with this chat, you need to set up your credentials.",
      { duration: 8000 }
    );
    
    setTimeout(() => {
      toast.info(
        "1. Make sure to add GOOGLE_DRIVE_PRIVATE_KEY and GOOGLE_DRIVE_CLIENT_EMAIL in your Supabase secrets",
        { duration: 8000 }
      );
    }, 500);
    
    setTimeout(() => {
      toast.info(
        "2. Create a service account in Google Cloud Console with Drive API access",
        { duration: 8000 }
      );
    }, 1000);
    
    setTimeout(() => {
      toast.info(
        "3. Share files directly with the service account email address",
        { duration: 8000 }
      );
    }, 1500);
    
    setTimeout(() => {
      toast.info(
        "4. For Shared Drives, add the GOOGLE_SHARED_DRIVE_ID in your Supabase secrets",
        { duration: 8000 }
      );
    }, 2000);
    
    setTimeout(() => {
      toast.info(
        "5. Check Edge Function logs for detailed error messages",
        { duration: 8000 }
      );
    }, 2500);
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
    searchDriveFiles // Add the search function to the return object
  };
};
