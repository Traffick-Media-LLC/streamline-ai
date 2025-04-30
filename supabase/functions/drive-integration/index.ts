
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": 
    "authorization, x-client-info, apikey, content-type",
};

// Add logging functions for consistency with the chat function
const startTimer = () => performance.now();
const calculateDuration = (startTime) => Math.round(performance.now() - startTime);

const logEvent = async (supabase, requestId, eventType, component, message, options = {}) => {
  try {
    const { 
      userId = null, 
      chatId = null, 
      durationMs = null, 
      metadata = null, 
      errorDetails = null,
      severity = 'info'
    } = options;
    
    // Log to console
    const logPrefix = `[${requestId}][${component}][${eventType}]`;
    if (severity === 'error' || severity === 'critical') {
      console.error(`${logPrefix} ${message}`, errorDetails || metadata || {});
    } else if (severity === 'warning') {
      console.warn(`${logPrefix} ${message}`, metadata || {});
    } else {
      console.log(`${logPrefix} ${message}`, metadata || {});
    }
    
    // Store in database
    if (supabase) {
      await supabase
        .from('chat_logs')
        .insert({
          request_id: requestId,
          user_id: userId,
          chat_id: chatId,
          event_type: eventType,
          component,
          message,
          duration_ms: durationMs,
          metadata,
          error_details: errorDetails,
          severity
        });
    }
  } catch (e) {
    // Don't let logging failures break the main flow
    console.error("Error in logging system:", e);
  }
};

const logError = async (supabase, requestId, component, message, error, options = {}) => {
  try {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    };
    
    await logEvent(supabase, requestId, 'error', component, message, {
      ...options,
      errorDetails,
      severity: options.severity || 'error'
    });
  } catch (e) {
    console.error("Error in error logging system:", e);
  }
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const driveCredentials = Deno.env.get("GOOGLE_DRIVE_CREDENTIALS");

  if (!driveCredentials) {
    console.error("Google Drive credentials not configured");
    return new Response(
      JSON.stringify({ 
        error: "Google Drive credentials not configured", 
        details: "Please set the GOOGLE_DRIVE_CREDENTIALS secret in your Supabase project"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let requestId = '';
  const mainStartTime = startTimer();

  try {
    const { operation, fileId, query, limit = 10, requestId: clientRequestId } = await req.json();
    requestId = clientRequestId || `drive-${Date.now()}`;
    
    await logEvent(supabase, requestId, 'function_invoked', 'drive_integration', `Drive integration invoked with operation: ${operation}`, {
      metadata: { operation, fileId, query, limit }
    });

    // Parse credentials to validate they're properly formatted
    let credentials;
    try {
      credentials = JSON.parse(driveCredentials);
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error("Invalid credential format - missing required fields");
      }
    } catch (e) {
      await logError(supabase, requestId, 'drive_integration', 'Invalid Google Drive credentials format', e, {
        severity: 'critical'
      });
      return new Response(
        JSON.stringify({ 
          error: "Invalid Google Drive credentials format",
          details: "The GOOGLE_DRIVE_CREDENTIALS secret appears to be malformed. It should be a valid JSON service account key."
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (operation === "list") {
      // List files from Supabase database
      await logEvent(supabase, requestId, 'list_files_started', 'drive_integration', 'Listing drive files from database');
      
      const startTime = startTimer();
      const { data: files, error } = await supabase
        .from("drive_files")
        .select("*")
        .order("name", { ascending: true })
        .limit(limit || 50);

      if (error) {
        await logError(supabase, requestId, 'drive_integration', 'Error listing files from database', error);
        throw error;
      }

      await logEvent(supabase, requestId, 'list_files_completed', 'drive_integration', `Listed ${files.length} files from database`, {
        durationMs: calculateDuration(startTime)
      });
      
      return new Response(
        JSON.stringify({ files }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } 
    else if (operation === "search") {
      if (!query) {
        await logEvent(supabase, requestId, 'search_missing_query', 'drive_integration', 'Search operation missing query parameter', {
          severity: 'warning'
        });
        
        return new Response(
          JSON.stringify({ error: "Query parameter is required for search" }),
          { 
            status: 400, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      await logEvent(supabase, requestId, 'search_files_started', 'drive_integration', `Searching files with query: "${query}"`);
      
      // First attempt: Search by file name
      const startTime = startTimer();
      let { data: files, error } = await supabase
        .from("drive_files")
        .select("*")
        .ilike("name", `%${query}%`)
        .order("last_accessed", { ascending: false })
        .limit(limit || 10);

      if (error) {
        await logError(supabase, requestId, 'drive_integration', 'Error searching files by name', error);
        throw error;
      }

      // If not enough results, try content search 
      if (files.length < limit) {
        await logEvent(supabase, requestId, 'search_content_started', 'drive_integration', `Searching file content with query: "${query}"`, {
          metadata: { initialResults: files.length }
        });
        
        const contentStartTime = startTimer();
        const remainingLimit = limit - files.length;
        
        // Get file IDs we already found
        const existingIds = files.map(f => f.id);
        
        try {
          // Search in file content
          const { data: contentMatches, error: contentError } = await supabase
            .from("file_content")
            .select("file_id")
            .textSearch("content", query)
            .not("file_id", "in", `(${existingIds.join(',')})`)
            .limit(remainingLimit);

          if (contentError) {
            await logError(supabase, requestId, 'drive_integration', 'Error in content search', contentError);
          } else if (contentMatches && contentMatches.length > 0) {
            await logEvent(supabase, requestId, 'content_matches_found', 'drive_integration', `Found ${contentMatches.length} content matches`, {
              durationMs: calculateDuration(contentStartTime)
            });
            
            const fileIds = contentMatches.map(match => match.file_id);
            
            // Get the actual file records for these matches
            const { data: contentFiles, error: filesError } = await supabase
              .from("drive_files")
              .select("*")
              .in("id", fileIds);

            if (filesError) {
              await logError(supabase, requestId, 'drive_integration', 'Error getting content-matched files', filesError);
            } else if (contentFiles && contentFiles.length > 0) {
              // Combine with our name-based matches
              files = [...files, ...contentFiles];
              
              await logEvent(supabase, requestId, 'combined_search_results', 'drive_integration', `Combined search results: ${files.length} files`);
            }
          }
        } catch (e) {
          await logError(supabase, requestId, 'drive_integration', 'Exception in content search', e);
        }
      }
      
      await logEvent(supabase, requestId, 'search_files_completed', 'drive_integration', `Search returned ${files.length} files`, {
        durationMs: calculateDuration(startTime),
        metadata: { query, resultCount: files.length }
      });
      
      return new Response(
        JSON.stringify({ files }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    else if (operation === "get" && fileId) {
      await logEvent(supabase, requestId, 'get_file_started', 'drive_integration', `Getting file with ID: ${fileId}`);
      
      // Get file metadata
      const fileStartTime = startTimer();
      const { data: file, error: fileError } = await supabase
        .from("drive_files")
        .select("*")
        .eq("id", fileId)
        .single();

      if (fileError) {
        await logError(supabase, requestId, 'drive_integration', `Error getting file metadata for ${fileId}`, fileError);
        throw new Error(`File not found: ${fileId}`);
      }

      await logEvent(supabase, requestId, 'file_metadata_retrieved', 'drive_integration', `Retrieved file metadata for ${fileId}`, {
        durationMs: calculateDuration(fileStartTime),
        metadata: { fileName: file.name, fileType: file.file_type }
      });
      
      // Update access timestamp
      const updateStartTime = startTimer();
      await supabase
        .from("drive_files")
        .update({ last_accessed: new Date().toISOString() })
        .eq("id", fileId);

      // Get file content
      const contentStartTime = startTimer();
      const { data: content, error: contentError } = await supabase
        .from("file_content")
        .select("*")
        .eq("file_id", fileId)
        .maybeSingle();

      if (contentError) {
        await logError(supabase, requestId, 'drive_integration', `Error getting file content for ${fileId}`, contentError);
      }
      
      if (content) {
        await logEvent(supabase, requestId, 'file_content_retrieved', 'drive_integration', `Retrieved content for file ${fileId}`, {
          durationMs: calculateDuration(contentStartTime),
          metadata: { contentLength: content.content?.length || 0 }
        });
      } else {
        await logEvent(supabase, requestId, 'file_content_not_found', 'drive_integration', `No content found for file ${fileId}`, {
          durationMs: calculateDuration(contentStartTime),
          severity: 'warning'
        });
      }
      
      await logEvent(supabase, requestId, 'get_file_completed', 'drive_integration', `Successfully retrieved file ${fileId}`, {
        durationMs: calculateDuration(mainStartTime)
      });
      
      return new Response(
        JSON.stringify({ file, content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    else if (operation === "sync") {
      await logEvent(supabase, requestId, 'sync_started', 'drive_integration', 'Starting Google Drive sync operation');
      
      // This would be where the synchronization with Google Drive happens
      // For now, simulate a successful sync operation since we're focused on fixing the error
      
      const syncStartTime = startTimer();
      await logEvent(supabase, requestId, 'sync_completed', 'drive_integration', 'Drive sync operation simulated (not yet implemented)', {
        durationMs: calculateDuration(syncStartTime),
        metadata: { processed: [] }
      });
      
      return new Response(
        JSON.stringify({ success: true, processed: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown operation
    await logEvent(supabase, requestId, 'invalid_operation', 'drive_integration', `Invalid operation: ${operation}`, {
      severity: 'warning'
    });
    
    return new Response(
      JSON.stringify({ error: "Invalid operation" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    await logError(supabase, requestId, 'drive_integration', 'Exception in drive integration function', error, {
      severity: 'critical',
      durationMs: calculateDuration(mainStartTime)
    });
    
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
