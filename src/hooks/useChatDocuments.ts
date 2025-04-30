import { useState } from "react";
import { 
  logChatEvent, 
  logChatError, 
  generateRequestId, 
  createErrorEventName,
  formatErrorForLogging
} from "../utils/chatLogging";
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
    
    // Generate a request ID if not provided
    const fetchRequestId = requestId || generateRequestId();
    const startTime = performance.now();
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Use UUID for request ID to ensure it's compatible with UUID columns in the database
      const formattedRequestId = fetchRequestId;
      
      // Format chatId to ensure UUID compatibility
      let formattedChatId = chatId;
      let originalChatId = chatId; // Keep original for client-side reference
      
      try {
        if (chatId && chatId.startsWith('guest-')) {
          // Create a stable UUID derived from the guest chat ID for database compatibility
          formattedChatId = uuidv4();
          console.log(`Converting guest chat ID ${chatId} to UUID ${formattedChatId} for database compatibility`);
        }
      } catch (chatIdError) {
        await logChatError(
          formattedRequestId,
          'useChatDocuments',
          'Error formatting chatId',
          chatIdError,
          { originalChatId: chatId },
          undefined,
          userId,
          'error',
          'document'
        );
        // Continue with original chatId if formatting fails
      }
      
      // Log the document fetch attempt with enhanced metadata
      try {
        await logChatEvent({
          requestId: formattedRequestId,
          userId,
          chatId: formattedChatId,
          eventType: 'fetch_document_contents',
          component: 'useChatDocuments',
          message: `Fetching contents for ${documentIds.length} documents`,
          metadata: { 
            documentIds,
            isAuthenticated: !!userId,
            isGuest: !userId && chatId?.startsWith('guest-')
          },
          category: 'document'
        });
      } catch (logError) {
        console.error("Failed to log chat event:", logError);
        // Continue execution even if logging fails
      }

      const documents = [];
      const processedIds: Record<string, boolean> = {};
      const errors: Record<string, any> = {};
      
      for (const id of documentIds) {
        try {
          // Skip duplicate IDs
          if (processedIds[id]) {
            await logChatEvent({
              requestId: formattedRequestId,
              userId,
              chatId: formattedChatId,
              eventType: 'document_duplicate_id',
              component: 'useChatDocuments',
              message: `Skipping duplicate document ID: ${id}`,
              severity: 'warning',
              category: 'document'
            });
            continue;
          }
          
          processedIds[id] = true;
          
          // Add validation to ensure documentId is properly formatted
          if (!id || typeof id !== 'string') {
            await logChatEvent({
              requestId: formattedRequestId,
              userId,
              chatId: formattedChatId,
              eventType: 'document_invalid_id',
              component: 'useChatDocuments',
              message: `Invalid document ID: ${id}, skipping`,
              severity: 'warning',
              category: 'document',
              metadata: { invalidId: id, type: typeof id }
            });
            continue;
          }

          await logChatEvent({
            requestId: formattedRequestId,
            userId,
            chatId: formattedChatId,
            eventType: 'document_fetch_started',
            component: 'useChatDocuments',
            message: `Fetching document content for ID: ${id}`,
            category: 'document'
          });
          
          const documentStartTime = performance.now();
          
          // Track edge function network error separately
          try {
            const response = await supabase.functions.invoke('drive-integration', {
              body: { 
                operation: 'get', 
                fileId: id, 
                requestId: formattedRequestId,
                includeWebLink: true // Request web link in response
              }
            });
            
            // Check for response.error first (API-level error)
            if (response.error) {
              errors[id] = response.error;
              
              // Categorize the error for better diagnostics
              const errorMsg = response.error.message || "";
              const isCredentialsError = 
                errorMsg.includes("credentials") || 
                errorMsg.includes("authentication") ||
                errorMsg.includes("parse") ||
                errorMsg.includes("JSON") ||
                errorMsg.includes("key");
              
              const isNetworkError = 
                errorMsg.includes("network") ||
                errorMsg.includes("timeout") ||
                errorMsg.includes("connection") ||
                errorMsg.includes("ENOTFOUND");
              
              const errorCategory = isCredentialsError ? 'credential' : 
                                  isNetworkError ? 'network' : 'document';
                                      
              // Log with appropriate category
              await logChatError(
                formattedRequestId,
                'useChatDocuments',
                `Drive function error: ${errorMsg || "Unknown error"}`,
                response.error,
                { 
                  documentId: id,
                  endpoint: 'drive-integration',
                  operation: 'get'
                },
                formattedChatId,
                userId,
                'error',
                errorCategory
              );
                                      
              // Provide a user-friendly error message based on error type
              if (isCredentialsError) {
                toast.error("Google Drive credentials are invalid or malformed. Please check your configuration.");
                console.error("Google Drive credentials error details:", errorMsg);
              } else if (isNetworkError) {
                toast.error("Network error when connecting to Google Drive. Please check your internet connection.");
              } else {
                toast.error(`Error fetching document: ${errorMsg || "Unknown error"}`);
              }
              
              continue;
            }
            
            // Check for application-level error in the data object
            const data = response.data;
            if (!data) {
              await logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'document_empty_response',
                component: 'useChatDocuments',
                message: `Empty data response fetching document ${id}`,
                severity: 'warning',
                category: 'document'
              });
              continue;
            }
            
            if (data.error) {
              errors[id] = data.error;
              
              // Determine appropriate error category
              const errorMsg = data.error || "";
              const errorCategory = 
                errorMsg.includes("credentials") ? 'credential' : 
                errorMsg.includes("permission") ? 'auth' :
                errorMsg.includes("not found") ? 'document' : 'generic';
              
              await logChatError(
                formattedRequestId,
                'useChatDocuments',
                `Error fetching document ${id}: ${data.error || "Unknown error"}`,
                { message: data.error },
                { documentId: id },
                formattedChatId,
                userId,
                'error',
                errorCategory
              );
              
              // Show user-friendly error message
              if (data.error?.includes("Google Drive credentials not configured")) {
                toast.error("Document access is unavailable. Google Drive credentials are not configured.");
              } else if (data.error?.includes("credentials") || data.error?.includes("parse")) {
                toast.error("Invalid Google Drive credentials format. Please check your configuration.");
                console.error("Invalid Google Drive credentials format details:", data.error);
              } else if (data.error?.includes("permission")) {
                toast.error("Permission denied accessing document. Check service account permissions.");
              } else if (data.error?.includes("not found")) {
                toast.error(`Document not found: ${id}`);
              } else {
                toast.error(`Error fetching document: ${data.error}`);
              }
              
              continue;
            }
            
            // Validate response structure
            if (!data.file || !data.content) {
              await logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'document_invalid_structure',
                component: 'useChatDocuments',
                message: `Invalid document structure for ${id}`,
                severity: 'warning',
                category: 'document',
                metadata: { 
                  hasFile: !!data.file, 
                  hasContent: !!data.content,
                  responseKeys: Object.keys(data)
                }
              });
              continue;
            }
            
            // Process valid document
            if (data.file && data.content) {
              documents.push({
                id,
                name: data.file.name,
                content: data.content.content || "No content available",
                type: data.file.file_type,
                webLink: data.file.webLink || null, // Include web link if available
                thumbnailLink: data.file.thumbnailLink || null // Include thumbnail if available
              });
              
              await logChatEvent({
                requestId: formattedRequestId,
                userId,
                chatId: formattedChatId,
                eventType: 'document_content_fetched',
                component: 'useChatDocuments',
                message: `Successfully fetched document: ${data.file.name}`,
                durationMs: Math.round(performance.now() - documentStartTime),
                metadata: {
                  documentId: id,
                  documentName: data.file.name,
                  contentLength: data.content.content?.length || 0,
                  fileType: data.file.file_type,
                  hasWebLink: !!data.file.webLink
                },
                category: 'document'
              });
            }
          } catch (networkErr) {
            errors[id] = networkErr;
            
            await logChatError(
              formattedRequestId,
              'useChatDocuments',
              `Network error fetching document ${id}`,
              networkErr,
              { documentId: id },
              formattedChatId, // This could be the issue
              userId,
              'error',
              'network'
            );
            
            toast.error(`Network error fetching document: ${networkErr.message || "Unknown error"}`);
          }
        } catch (err) {
          errors[id] = err;
          
          await logChatError(
            formattedRequestId,
            'useChatDocuments',
            `Exception in document fetch loop for ${id}`,
            err,
            { documentId: id },
            formattedChatId, // Make sure formattedChatId is in scope here
            userId,
            'error',
            'document'
          );
        }
      }
      
      // Consolidate error information
      const errorCount = Object.keys(errors).length;
      if (errorCount > 0) {
        await logChatEvent({
          requestId: formattedRequestId,
          userId,
          chatId: formattedChatId,
          eventType: 'document_fetch_errors',
          component: 'useChatDocuments',
          message: `Encountered ${errorCount} errors while fetching documents`,
          severity: 'warning',
          metadata: { 
            errorCount,
            errorDocumentIds: Object.keys(errors),
            successCount: documents.length,
            totalAttempted: documentIds.length
          },
          category: 'document'
        });
        
        // If all documents failed, show a more specific error toast
        if (documents.length === 0 && documentIds.length > 0) {
          toast.error(`Failed to retrieve any document contents. Please check the document permissions.`);
        } 
        // If some succeeded, show a warning toast
        else if (documents.length < documentIds.length) {
          toast.warning(`Retrieved ${documents.length} of ${documentIds.length} documents. Some documents couldn't be accessed.`);
        }
      }
      
      await logChatEvent({
        requestId: formattedRequestId,
        userId,
        chatId: formattedChatId,
        eventType: 'document_fetch_complete',
        component: 'useChatDocuments',
        message: `Fetched ${documents.length}/${documentIds.length} documents successfully`,
        durationMs: Math.round(performance.now() - startTime),
        metadata: { 
          success: documents.length, 
          total: documentIds.length,
          documentNames: documents.map(d => d.name)
        },
        category: 'document'
      });
      
      return documents;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      console.error("Failed to fetch document contents:", errorMessage);
      
      // Use a valid UUID for request ID in case of errors
      const fallbackRequestId = uuidv4();
      
      // Safely log the error without referencing potentially invalid chatId
      try {
        await logChatError(
          fetchRequestId || fallbackRequestId,
          'useChatDocuments',
          `Failed to fetch document contents: ${errorMessage}`,
          err,
          {
            documentCount: documentIds?.length || 0,
            elapsedTime: Math.round(performance.now() - startTime)
          },
          undefined,
          userId,
          'error',
          'document'
        );
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

  // New function to search for documents
  const searchDocuments = async (
    query: string,
    userId?: string,
    chatId?: string,
    requestId?: string
  ) => {
    if (!query || query.trim() === '') {
      toast.error("Please enter a search term");
      return [];
    }
    
    setIsFetching(true);
    
    // Generate a request ID if not provided
    const searchRequestId = requestId || generateRequestId();
    const startTime = performance.now();
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Format chatId for database compatibility
      let formattedChatId = chatId;
      
      try {
        if (chatId && chatId.startsWith('guest-')) {
          formattedChatId = uuidv4();
        }
      } catch (error) {
        console.error("Error formatting chat ID:", error);
      }
      
      await logChatEvent({
        requestId: searchRequestId,
        userId,
        chatId: formattedChatId,
        eventType: 'document_search_started',
        component: 'useChatDocuments',
        message: `Searching for documents with query: "${query}"`,
        metadata: { searchQuery: query },
        category: 'document'
      });
      
      // Call the drive-integration edge function with search operation
      const response = await supabase.functions.invoke('drive-integration', {
        body: { 
          operation: 'search', 
          query,
          requestId: searchRequestId,
          includeWebLinks: true // Request web links in search results
        }
      });
      
      if (response.error) {
        // Check for specific error messages about credentials
        const errorMessage = response.error.message || "Unknown error";
        
        await logChatError(
          searchRequestId,
          'useChatDocuments',
          `Error searching documents: ${errorMessage}`,
          response.error,
          { searchQuery: query },
          formattedChatId,
          userId,
          'error',
          'document'
        );
        
        // If it's a credentials issue, show a more specific message
        if (errorMessage.includes('credentials') || errorMessage.includes('JWT')) {
          toast.error("Google Drive credentials are not properly configured");
          console.error("Google Drive credentials error:", errorMessage);
        } else {
          toast.error(`Error searching documents: ${errorMessage}`);
        }
        
        return [];
      }
      
      const data = response.data;
      
      if (!data || !data.files || !Array.isArray(data.files)) {
        await logChatEvent({
          requestId: searchRequestId,
          userId,
          chatId: formattedChatId,
          eventType: 'document_search_invalid_response',
          component: 'useChatDocuments',
          message: 'Invalid response format from search',
          severity: 'warning',
          category: 'document'
        });
        
        toast.error("Invalid response from document search");
        return [];
      }
      
      await logChatEvent({
        requestId: searchRequestId,
        userId,
        chatId: formattedChatId,
        eventType: 'document_search_completed',
        component: 'useChatDocuments',
        message: `Found ${data.files.length} documents for query "${query}"`,
        durationMs: Math.round(performance.now() - startTime),
        metadata: { 
          resultCount: data.files.length,
          fileNames: data.files.slice(0, 5).map(f => f.name) // First 5 for brevity
        },
        category: 'document'
      });
      
      return data.files;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      
      console.error("Document search error:", errorMessage);
      
      // Make sure formattedChatId is defined here
      const localFormattedChatId = chatId && chatId.startsWith('guest-') ? uuidv4() : chatId;
      
      await logChatError(
        searchRequestId,
        'useChatDocuments',
        `Exception searching documents: ${errorMessage}`,
        err,
        { searchQuery: query },
        localFormattedChatId, // This is now properly defined
        userId,
        'error',
        'document'
      );
      
      toast.error("Failed to search documents. Please check if Google Drive is properly configured.");
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
    searchDocuments,
    isFetching
  };
};
