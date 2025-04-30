
import { useState } from "react";
import { logChatEvent } from "../utils/chatLogging";
import { toast } from "@/components/ui/sonner";
import { v4 as uuidv4 } from 'uuid';

export const useChatDocuments = () => {
  const [documentContext, setDocumentContext] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const getDocumentContext = () => {
    return documentContext;
  };

  const fetchDocumentContents = async (
    documentIds: string[], 
    userId?: string, 
    chatId?: string,
    requestId?: string
  ) => {
    if (!documentIds || documentIds.length === 0) return [];
    
    setIsFetching(true);
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Use UUID for request ID to ensure it's compatible with UUID columns in the database
      const formattedRequestId = requestId || uuidv4();
      
      // Format chatId to ensure UUID compatibility
      // For guest chats, we'll generate a UUID to use as a reference in the database
      // but we'll use the original chatId for client-side operations
      let formattedChatId = chatId;
      if (chatId && chatId.startsWith('guest-')) {
        // Create a UUID derived from the guest chat ID for database compatibility
        formattedChatId = uuidv4();
      }
      
      // Log the document fetch attempt
      try {
        logChatEvent({
          requestId: formattedRequestId,
          userId,
          chatId: formattedChatId, // Use the UUID-compatible chat ID
          eventType: 'fetch_document_contents',
          component: 'useChatDocuments',
          message: `Fetching contents for ${documentIds.length} documents`,
          metadata: { documentIds }
        });
      } catch (logError) {
        console.error("Failed to log chat event:", logError);
        // Continue execution even if logging fails
      }

      const documents = [];
      
      for (const id of documentIds) {
        try {
          // Add validation to ensure documentId is properly formatted
          if (!id || typeof id !== 'string') {
            console.warn(`Invalid document ID: ${id}, skipping`);
            continue;
          }

          const { data, error } = await supabase.functions.invoke('drive-integration', {
            body: { 
              operation: 'get', 
              fileId: id, 
              requestId: formattedRequestId 
            }
          });
          
          if (error) {
            // Log error but continue with other documents
            try {
              logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'fetch_document_error',
                component: 'useChatDocuments',
                message: `Error fetching document ${id}: ${error.message || "Unknown error"}`,
                severity: 'error',
                errorDetails: error
              });
            } catch (logErr) {
              console.error("Failed to log document fetch error:", logErr);
            }
            
            // Show user-friendly error message
            if (error.message?.includes("Google Drive credentials not configured")) {
              toast.error("Document access is unavailable. Google Drive credentials are not configured.");
            } else {
              toast.error(`Error fetching document: ${error.message}`);
            }
            
            continue;
          }
          
          if (!data) {
            try {
              logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'fetch_document_empty',
                component: 'useChatDocuments',
                message: `Empty response fetching document ${id}`,
                severity: 'warning'
              });
            } catch (logErr) {
              console.error("Failed to log empty document response:", logErr);
            }
            continue;
          }
          
          if (data?.file && data?.content) {
            documents.push({
              id,
              name: data.file.name,
              content: data.content.content || "No content available",
              type: data.file.file_type
            });
            
            try {
              logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'document_content_fetched',
                component: 'useChatDocuments',
                message: `Successfully fetched document: ${data.file.name}`,
                metadata: {
                  documentId: id,
                  documentName: data.file.name,
                  contentLength: data.content.content?.length || 0
                }
              });
            } catch (logErr) {
              console.error("Failed to log successful document fetch:", logErr);
            }
          } else {
            try {
              logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'document_invalid_structure',
                component: 'useChatDocuments',
                message: `Invalid document structure for ${id}`,
                severity: 'warning',
                metadata: { 
                  hasFile: !!data?.file, 
                  hasContent: !!data?.content 
                }
              });
            } catch (logErr) {
              console.error("Failed to log invalid document structure:", logErr);
            }
          }
        } catch (err) {
          console.error("Exception in document fetch loop:", err);
          try {
            logChatEvent({
              requestId: formattedRequestId,
              userId,
              chatId: formattedChatId,
              eventType: 'document_fetch_exception',
              component: 'useChatDocuments',
              message: `Exception fetching document ${id}: ${err instanceof Error ? err.message : "Unknown error"}`,
              severity: 'error',
              errorDetails: err
            });
          } catch (logErr) {
            console.error("Failed to log document fetch exception:", logErr);
          }
        }
      }
      
      try {
        logChatEvent({
          requestId: formattedRequestId,
          userId,
          chatId: formattedChatId,
          eventType: 'document_fetch_complete',
          component: 'useChatDocuments',
          message: `Fetched ${documents.length}/${documentIds.length} documents successfully`,
          metadata: { 
            success: documents.length, 
            total: documentIds.length,
            documentNames: documents.map(d => d.name)
          }
        });
      } catch (logErr) {
        console.error("Failed to log document fetch completion:", logErr);
      }
      
      return documents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      console.error("Failed to fetch document contents:", errorMessage);
      
      // Use a valid UUID for request ID in case of errors
      const fallbackRequestId = uuidv4();
      
      // Safely log the error without referencing potentially invalid chatId
      try {
        logChatEvent({
          requestId: fallbackRequestId,
          userId,
          eventType: 'document_fetch_failed',
          component: 'useChatDocuments',
          message: `Failed to fetch document contents: ${errorMessage}`,
          severity: 'error',
          errorDetails: err
        });
      } catch (logErr) {
        // If even logging fails, just console log
        console.error("Error in document fetching and logging:", logErr);
      }
      
      toast.error("Failed to retrieve document contents. Please try again.");
      
      return [];
    } finally {
      setIsFetching(false);
    }
  };

  return {
    documentContext,
    setDocumentContext,
    getDocumentContext,
    fetchDocumentContents,
    isFetching
  };
};
