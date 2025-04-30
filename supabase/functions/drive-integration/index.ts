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

// Google Drive API client
async function createDriveClient(credentials) {
  try {
    let key;
    try {
      // First, ensure credentials is a string
      if (typeof credentials !== 'string') {
        throw new Error(`Credentials must be a string, got ${typeof credentials}`);
      }
      
      // Check if the credentials look like a JSON string
      if (!credentials.trim().startsWith('{')) {
        throw new Error("Credentials don't appear to be in JSON format");
      }
      
      // Attempt to parse
      key = JSON.parse(credentials);
      
      // Validate that key has required properties
      if (!key.client_email || !key.private_key) {
        throw new Error("Credentials missing required fields (client_email or private_key)");
      }
    } catch (e) {
      console.error("Error parsing Google Drive credentials:", e);
      const credentialPreview = typeof credentials === 'string' 
        ? `${credentials.substring(0, 20)}...` 
        : `<non-string: ${typeof credentials}>`;
      throw new Error(`Failed to parse credentials: ${e.message}. Preview: ${credentialPreview}`);
    }
    
    // Use the JWT client from Google Auth library for Deno
    const token = await generateJWT(key);
    
    return {
      token,
      clientEmail: key.client_email
    };
  } catch (e) {
    console.error("Error creating Drive client:", e);
    throw new Error(`Failed to initialize Google Drive client: ${e.message}`);
  }
}

// Generate JWT for Google Drive API authentication
async function generateJWT(key) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  
  // Create the JWT
  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const claimBase64 = btoa(JSON.stringify(claim)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  const signatureInput = `${headerBase64}.${claimBase64}`;
  
  try {
    // Import private key
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(key.private_key),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
    
    // Sign the JWT
    const signature = await crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      privateKey,
      encoder.encode(signatureInput)
    );
    
    // Convert signature to base64url
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const jwt = `${signatureInput}.${signatureBase64}`;
    
    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error(`Failed to obtain access token: ${JSON.stringify(tokenData)}`);
    }
    
    return tokenData.access_token;
  } catch (e) {
    console.error("Error generating JWT:", e);
    throw new Error(`JWT generation failed: ${e.message}`);
  }
}

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem) {
  try {
    if (!pem || typeof pem !== 'string') {
      throw new Error(`Invalid private key format: ${typeof pem}`);
    }
    
    const base64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\n/g, "");
    
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    
    return buffer.buffer;
  } catch (e) {
    console.error("Error converting PEM to ArrayBuffer:", e);
    throw new Error(`Private key conversion failed: ${e.message}`);
  }
}

// List files from Google Drive
async function listDriveFiles(token, limit = 10) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=${limit}&fields=files(id,name,mimeType,createdTime,modifiedTime,description)`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list files: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.files.map(file => ({
    id: file.id,
    name: file.name,
    file_type: file.mimeType,
    description: file.description || "",
    created_at: file.createdTime,
    updated_at: file.modifiedTime,
    last_accessed: new Date().toISOString()
  }));
}

// Search files in Google Drive
async function searchDriveFiles(token, query, limit = 10) {
  const q = `name contains '${query}' or fullText contains '${query}'`;
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${limit}&fields=files(id,name,mimeType,createdTime,modifiedTime,description)`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to search files: ${error.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  return data.files.map(file => ({
    id: file.id,
    name: file.name,
    file_type: file.mimeType,
    description: file.description || "",
    created_at: file.createdTime,
    updated_at: file.modifiedTime,
    last_accessed: new Date().toISOString()
  }));
}

// Get file content from Google Drive
async function getDriveFileContent(token, fileId) {
  // First get file metadata
  const metaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,description`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!metaResponse.ok) {
    const error = await metaResponse.json();
    throw new Error(`Failed to get file metadata: ${error.error?.message || metaResponse.statusText}`);
  }
  
  const file = await metaResponse.json();
  
  // Get content based on mimeType
  let content = "";
  let contentFormat = "text";
  
  if (file.mimeType === 'application/vnd.google-apps.document') {
    // Export Google Docs as plain text
    const contentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (contentResponse.ok) {
      content = await contentResponse.text();
    } else {
      console.warn(`Could not export Google Doc as text: ${fileId}`);
      content = "This document could not be exported as text.";
    }
  } 
  else if (file.mimeType.startsWith('text/') || 
           file.mimeType === 'application/json' || 
           file.mimeType === 'application/xml') {
    // Download text files directly
    const contentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (contentResponse.ok) {
      content = await contentResponse.text();
    }
  } 
  else if (file.mimeType === 'application/pdf') {
    // For PDFs, just indicate it's a PDF
    contentFormat = "pdf";
    content = "PDF document. Text extraction not supported in this version.";
  }
  else {
    // For other types, provide a placeholder
    content = `File type ${file.mimeType} not supported for direct content extraction.`;
  }
  
  return {
    file,
    content: {
      file_id: fileId,
      content,
      content_format: contentFormat,
      content_status: "complete",
      processed_at: new Date().toISOString()
    }
  };
}

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

    // Initialize Google Drive client
    const startAuthTime = startTimer(); 
    await logEvent(supabase, requestId, 'drive_auth_started', 'drive_integration', 'Initializing Google Drive client');
    
    let driveClient;
    try {
      driveClient = await createDriveClient(driveCredentials);
      
      await logEvent(supabase, requestId, 'drive_auth_completed', 'drive_integration', 'Google Drive client initialized', {
        durationMs: calculateDuration(startAuthTime)
      });
    } catch (authError) {
      await logError(supabase, requestId, 'drive_integration', 'Failed to initialize Google Drive client', authError, {
        severity: 'critical'
      });
      
      return new Response(
        JSON.stringify({ 
          error: "Google Drive authentication failed", 
          details: authError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (operation === "list") {
      await logEvent(supabase, requestId, 'list_files_started', 'drive_integration', 'Listing files from Google Drive');
      
      const startTime = startTimer();
      const files = await listDriveFiles(driveClient.token, limit || 50);

      await logEvent(supabase, requestId, 'list_files_completed', 'drive_integration', `Listed ${files.length} files from Google Drive`, {
        durationMs: calculateDuration(startTime),
        metadata: { fileCount: files.length }
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
      
      const startTime = startTimer();
      const files = await searchDriveFiles(driveClient.token, query, limit || 10);

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
      await logEvent(supabase, requestId, 'get_file_started', 'drive_integration', `Getting file content with ID: ${fileId}`);
      
      const startTime = startTimer();
      const fileData = await getDriveFileContent(driveClient.token, fileId);

      await logEvent(supabase, requestId, 'get_file_completed', 'drive_integration', `Retrieved file content for ${fileId}`, {
        durationMs: calculateDuration(startTime),
        metadata: { 
          fileName: fileData.file.name, 
          fileType: fileData.file.mimeType,
          contentLength: fileData.content.content?.length || 0
        }
      });
      
      // Track access in the database but don't rely on it for retrieval
      try {
        const existingFile = await supabase
          .from("drive_files")
          .select("id")
          .eq("id", fileId)
          .maybeSingle();
        
        if (existingFile.data) {
          // Update last accessed timestamp
          await supabase
            .from("drive_files")
            .update({ last_accessed: new Date().toISOString() })
            .eq("id", fileId);
        } else {
          // Store file metadata for future reference
          await supabase
            .from("drive_files")
            .insert({
              id: fileData.file.id,
              name: fileData.file.name, 
              file_type: fileData.file.mimeType,
              description: fileData.file.description || null
            });
        }
        
        // Store content for caching if needed later
        const existingContent = await supabase
          .from("file_content")
          .select("id")
          .eq("file_id", fileId)
          .maybeSingle();
        
        if (existingContent.data) {
          await supabase
            .from("file_content")
            .update({
              content: fileData.content.content,
              content_format: fileData.content.content_format,
              processed_at: new Date().toISOString()
            })
            .eq("file_id", fileId);
        } else {
          await supabase
            .from("file_content")
            .insert({
              file_id: fileId,
              content: fileData.content.content,
              content_format: fileData.content.content_format
            });
        }
      } catch (dbError) {
        // Don't fail if database logging fails
        await logError(supabase, requestId, 'drive_integration', 'Failed to update file access records', dbError, { severity: 'warning' });
      }
      
      return new Response(
        JSON.stringify({ file: fileData.file, content: fileData.content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    else if (operation === "sync") {
      // This would be a full sync operation to keep the database in sync with Google Drive
      // For now, we'll implement a basic version that gets the latest files from Drive
      await logEvent(supabase, requestId, 'sync_started', 'drive_integration', 'Starting Google Drive sync operation');
      
      const syncStartTime = startTimer();
      const files = await listDriveFiles(driveClient.token, 20); // Get top 20 files
      
      // Update or insert files in the database
      const processed = [];
      
      for (const file of files) {
        try {
          const { data: existingFile } = await supabase
            .from("drive_files")
            .select("id, updated_at")
            .eq("id", file.id)
            .maybeSingle();
          
          if (existingFile) {
            // Update existing record
            await supabase
              .from("drive_files")
              .update({
                name: file.name,
                file_type: file.file_type,
                description: file.description,
                updated_at: file.updated_at
              })
              .eq("id", file.id);
          } else {
            // Insert new record
            await supabase
              .from("drive_files")
              .insert(file);
          }
          
          processed.push({ id: file.id, name: file.name, action: existingFile ? 'updated' : 'added' });
        } catch (dbError) {
          await logError(supabase, requestId, 'drive_integration', `Error syncing file ${file.id}`, dbError);
        }
      }
      
      await logEvent(supabase, requestId, 'sync_completed', 'drive_integration', `Drive sync operation completed: processed ${processed.length} files`, {
        durationMs: calculateDuration(syncStartTime),
        metadata: { processed }
      });
      
      return new Response(
        JSON.stringify({ success: true, processed }),
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
    let errorMessage = "An error occurred";
    let statusCode = 500;
    
    if (error instanceof SyntaxError && error.message.includes("JSON")) {
      errorMessage = "Invalid JSON in request body";
      statusCode = 400;
    } else {
      errorMessage = error.message || "An unknown error occurred";
    }
    
    await logError(supabase, requestId, 'drive_integration', 'Exception in drive integration function', error, {
      severity: 'critical',
      durationMs: calculateDuration(mainStartTime)
    });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
