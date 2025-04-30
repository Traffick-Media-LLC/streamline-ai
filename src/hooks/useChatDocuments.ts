
import { useState } from "react";
import { logChatEvent } from "../utils/chatLogging";

export const useChatDocuments = () => {
  const [documentContext, setDocumentContext] = useState<string[]>([]);

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
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Log the document fetch attempt
      logChatEvent({
        requestId: requestId || 'unknown',
        userId,
        chatId,
        eventType: 'fetch_document_contents',
        component: 'useChatDocuments',
        message: `Fetching contents for ${documentIds.length} documents`,
        metadata: { documentIds }
      });

      const documents = [];
      
      for (const id of documentIds) {
        try {
          const { data, error } = await supabase.functions.invoke('drive-integration', {
            body: { operation: 'get', fileId: id }
          });
          
          if (error) {
            logChatEvent({
              requestId: requestId || 'unknown',
              userId,
              chatId,
              eventType: 'fetch_document_error',
              component: 'useChatDocuments',
              message: `Error fetching document ${id}`,
              severity: 'error',
              errorDetails: error
            });
            continue;
          }
          
          if (data && data.file && data.content) {
            documents.push({
              id,
              name: data.file.name,
              content: data.content.content,
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
                contentLength: data.content.content.length
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
            message: `Exception fetching document ${id}`,
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
      logChatEvent({
        requestId: requestId || 'unknown',
        userId,
        chatId,
        eventType: 'document_fetch_failed',
        component: 'useChatDocuments',
        message: 'Failed to fetch document contents',
        severity: 'error',
        errorDetails: err
      });
      
      return [];
    }
  };

  return {
    documentContext,
    setDocumentContext,
    getDocumentContext,
    fetchDocumentContents
  };
};
