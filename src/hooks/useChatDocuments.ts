
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logChatEvent, logChatError, generateRequestId } from "../utils/chatLogging";
import { DocumentReference } from "../types/chat";

export const useChatDocuments = () => {
  const [documentContext, setDocumentContext] = useState<string[]>([]);

  const getDocumentContext = () => {
    return documentContext;
  };

  const handleSetDocumentContext = (docIds: string[]) => {
    const requestId = generateRequestId();
    
    logChatEvent({
      requestId,
      eventType: 'set_document_context',
      component: 'useChatDocuments',
      message: `Setting document context: ${docIds.length} documents`,
      metadata: { documentIds: docIds, previousDocumentIds: documentContext }
    });
    
    setDocumentContext(docIds);
  };
  
  const fetchDocumentContents = async (
    documentIds: string[], 
    userId?: string | null,
    chatId?: string,
    requestId: string = generateRequestId()
  ): Promise<DocumentReference[]> => {
    let documentContents: DocumentReference[] = [];
    
    if (documentIds.length > 0) {
      logChatEvent({
        requestId,
        userId: userId,
        chatId,
        eventType: 'fetch_document_contents_started',
        component: 'useChatDocuments',
        message: `Fetching content for ${documentIds.length} documents`
      });
      
      for (const docId of documentIds) {
        try {
          logChatEvent({
            requestId,
            userId: userId,
            chatId,
            eventType: 'fetch_document_content',
            component: 'useChatDocuments',
            message: `Fetching document ${docId}`,
            metadata: { documentId: docId }
          });
          
          const { data, error } = await supabase.functions.invoke('drive-integration', {
            body: { operation: 'get', fileId: docId },
          });
          
          if (error) {
            await logChatError(
              requestId,
              'useChatDocuments',
              `Error fetching document ${docId}`,
              error,
              { documentId: docId },
              chatId,
              userId
            );
            continue;
          }
          
          if (data?.content?.content) {
            documentContents.push({
              id: docId,
              name: data.file.name,
              content: data.content.content,
              processed_at: data.content.processed_at
            });
            
            logChatEvent({
              requestId,
              userId: userId,
              chatId,
              eventType: 'document_content_fetched',
              component: 'useChatDocuments',
              message: `Document ${docId} fetched successfully`,
              metadata: { 
                documentId: docId,
                documentName: data.file.name,
                contentSize: data.content.content.length
              }
            });
          } else {
            logChatEvent({
              requestId,
              userId: userId,
              chatId,
              eventType: 'document_content_empty',
              component: 'useChatDocuments',
              message: `Document ${docId} has no content`,
              severity: 'warning',
              metadata: { documentId: docId }
            });
          }
        } catch (error) {
          await logChatError(
            requestId,
            'useChatDocuments',
            `Exception fetching document ${docId}`,
            error,
            { documentId: docId },
            chatId,
            userId
          );
        }
      }
      
      logChatEvent({
        requestId,
        userId: userId,
        chatId,
        eventType: 'fetch_document_contents_completed',
        component: 'useChatDocuments',
        message: `Fetched ${documentContents.length}/${documentIds.length} documents successfully`,
        metadata: { 
          successCount: documentContents.length,
          totalCount: documentIds.length
        }
      });
    }

    return documentContents;
  };

  return {
    documentContext,
    setDocumentContext: handleSetDocumentContext,
    getDocumentContext,
    fetchDocumentContents
  };
};
