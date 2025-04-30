
import { useState } from "react";
import { logChatEvent } from "../utils/chatLogging";
import { toast } from "@/components/ui/sonner";

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
      
      // Log the document fetch attempt
      logChatEvent({
        requestId: requestId || 'unknown',
        userId,
        chatId,
        eventType: 'fetch_document_contents',
        component: 'useChatDocuments',
        message: `Fetching contents for ${documentIds.length} documents directly from Google Drive`,
        metadata: { documentIds }
      });

      const documents = [];
      
      for (const id of documentIds) {
        try {
          const { data, error } = await supabase.functions.invoke('drive-integration', {
            body: { operation: 'get', fileId: id, requestId }
          });
          
          if (error) {
            logChatEvent({
              requestId: requestId || 'unknown',
              userId,
              chatId,
              eventType: 'fetch_document_error',
              component: 'useChatDocuments',
              message: `Error fetching document ${id}: ${error.message || "Unknown error"}`,
              severity: 'error',
              errorDetails: error
            });
            
            // Show user-friendly error message
            if (error.message?.includes("Google Drive credentials not configured")) {
              toast.error("Document access is unavailable. Google Drive credentials are not configured.");
            } else {
              toast.error(`Error fetching document: ${error.message}`);
            }
            
            continue;
          }
          
          if (!data) {
            logChatEvent({
              requestId: requestId || 'unknown',
              userId,
              chatId,
              eventType: 'fetch_document_empty',
              component: 'useChatDocuments',
              message: `Empty response fetching document ${id}`,
              severity: 'warning'
            });
            continue;
          }
          
          if (data?.file && data?.content) {
            documents.push({
              id,
              name: data.file.name,
              content: data.content.content || "No content available",
              type: data.file.file_type
            });
            
            logChatEvent({
              requestId: requestId || 'unknown',
              userId,
              chatId,
              eventType: 'document_content_fetched',
              component: 'useChatDocuments',
              message: `Successfully fetched document: ${data.file.name}`,
              metadata: {
                documentId: id,
                documentName: data.file.name,
                contentLength: data.content.content?.length || 0
              }
            });
          } else {
            logChatEvent({
              requestId: requestId || 'unknown',
              userId,
              chatId,
              eventType: 'document_invalid_structure',
              component: 'useChatDocuments',
              message: `Invalid document structure for ${id}`,
              severity: 'warning',
              metadata: { 
                hasFile: !!data?.file, 
                hasContent: !!data?.content 
              }
            });
          }
        } catch (err) {
          logChatEvent({
            requestId: requestId || 'unknown',
            userId,
            chatId,
            eventType: 'document_fetch_exception',
            component: 'useChatDocuments',
            message: `Exception fetching document ${id}: ${err instanceof Error ? err.message : "Unknown error"}`,
            severity: 'error',
            errorDetails: err
          });
        }
      }
      
      logChatEvent({
        requestId: requestId || 'unknown',
        userId,
        chatId,
        eventType: 'document_fetch_complete',
        component: 'useChatDocuments',
        message: `Fetched ${documents.length}/${documentIds.length} documents successfully`,
        metadata: { 
          success: documents.length, 
          total: documentIds.length,
          documentNames: documents.map(d => d.name)
        }
      });
      
      return documents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      logChatEvent({
        requestId: requestId || 'unknown',
        userId,
        chatId,
        eventType: 'document_fetch_failed',
        component: 'useChatDocuments',
        message: `Failed to fetch document contents: ${errorMessage}`,
        severity: 'error',
        errorDetails: err
      });
      
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
