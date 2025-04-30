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

// Enhanced logging with categories
const logEvent = async (supabase, requestId, eventType, component, message, options = {}) => {
  try {
    const { 
      userId = null, 
      chatId = null, 
      durationMs = null, 
      metadata = null, 
      errorDetails = null,
      severity = 'info',
      category = 'document'  // Default category for drive operations
    } = options;
    
    // Enhanced metadata with context information
    const enhancedMetadata = {
      ...(metadata || {}),
      timestamp: Date.now(),
      component
    };
    
    // Log to console with improved format
    const logPrefix = `[${requestId}][${component}][${eventType}][${category}]`;
    if (severity === 'error' || severity === 'critical') {
      console.error(`${logPrefix} ${message}`, errorDetails || enhancedMetadata || {});
    } else if (severity === 'warning') {
      console.warn(`${logPrefix} ${message}`, enhancedMetadata || {});
    } else {
      console.log(`${logPrefix} ${message}`, enhancedMetadata || {});
    }
    
    // Store in database with enhanced information
    if (supabase) {
      try {
        await supabase
          .from('chat_logs')
          .insert({
            request_id: requestId,
            user_id: userId,
            chat_id: chatId,
            event_type: eventType,
            component,
            category,
            message,
            duration_ms: durationMs,
            metadata: enhancedMetadata,
            error_details: errorDetails,
            severity
          });
      } catch (dbError) {
        console.error("Failed to insert log to database:", dbError);
      }
    }
  } catch (e) {
    // Don't let logging failures break the main flow
    console.error("Error in logging system:", e);
  }
};

// Enhanced error logging with more detailed error extraction
const logError = async (supabase, requestId, component, message, error, options = {}) => {
  try {
    // Extract detailed error information
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      status: error?.status,
      statusText: error?.statusText,
      // Additional Drive-specific information
      operation: options.operation || 'unknown',
      fileId: options.fileId,
      // Extract credential-related information (without sensitive data)
      credentialError: error.message?.includes('credential') || 
                       error.message?.includes('authentication') ||
                       error.message?.includes('key')
    };
    
    // Default to document category for drive operations
    const category = options.category || 'document';
    
    await logEvent(supabase, requestId, 'error', component, message, {
      ...options,
      errorDetails,
      severity: options.severity || 'error',
      category
    });
  } catch (e) {
    console.error("Error in error logging system:", e);
  }
};

// Google Drive API client - using individual credential fields instead of parsing JSON
async function createDriveClient(requestId = 'system') {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get individual credential fields from environment
    const clientEmail = Deno.env.get("GOOGLE_DRIVE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY");
    const projectId = Deno.env.get("GOOGLE_DRIVE_PROJECT_ID");
    
    // Log credential validation start (without sensitive data)
    await logEvent(supabase, requestId, 'drive_credential_validation', 'drive-integration', 
      'Validating Google Drive credentials', {
        metadata: { 
          hasClientEmail: !!clientEmail,
          hasPrivateKey: !!privateKey,
          hasProjectId: !!projectId,
          clientEmailDomain: clientEmail ? clientEmail.split('@')[1] : null
        },
        category: 'credential'
    });
    
    // Validate required fields with more detailed logging
    if (!clientEmail) {
      await logError(supabase, requestId, 'drive-integration', 'Missing client email credential', 
        new Error("GOOGLE_DRIVE_CLIENT_EMAIL is not configured in environment"), 
        { category: 'credential', severity: 'critical' });
      
      throw new Error("GOOGLE_DRIVE_CLIENT_EMAIL is not configured in environment");
    }
    
    if (!privateKey) {
      await logError(supabase, requestId, 'drive-integration', 'Missing private key credential', 
        new Error("GOOGLE_DRIVE_PRIVATE_KEY is not configured in environment"), 
        { category: 'credential', severity: 'critical' });
      
      throw new Error("GOOGLE_DRIVE_PRIVATE_KEY is not configured in environment");
    }
    
    // Check private key format
    if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      await logError(supabase, requestId, 'drive-integration', 'Invalid private key format - missing BEGIN marker', 
        new Error("GOOGLE_DRIVE_PRIVATE_KEY is missing BEGIN marker"), 
        { 
          category: 'credential', 
          severity: 'critical',
          metadata: {
            keyLength: privateKey.length,
            keyStartsWith: privateKey.substring(0, 20),
            containsNewlines: privateKey.includes('\\n')
          }
        });
        
      throw new Error("GOOGLE_DRIVE_PRIVATE_KEY is improperly formatted - missing BEGIN marker");
    }
    
    if (!privateKey.includes("-----END PRIVATE KEY-----")) {
      await logError(supabase, requestId, 'drive-integration', 'Invalid private key format - missing END marker', 
        new Error("GOOGLE_DRIVE_PRIVATE_KEY is missing END marker"), 
        { 
          category: 'credential', 
          severity: 'critical',
          metadata: {
            keyLength: privateKey.length,
            keyEndsWith: privateKey.substring(privateKey.length - 20),
            containsNewlines: privateKey.includes('\\n')
          }
        });
        
      throw new Error("GOOGLE_DRIVE_PRIVATE_KEY is improperly formatted - missing END marker");
    }
    
    // Log successful credential loading
    await logEvent(supabase, requestId, 'drive_credentials_valid', 'drive-integration', 
      'Successfully loaded Google Drive credentials', {
        metadata: { 
          clientEmail,
          projectId
        },
        category: 'credential'
    });
    
    // Create key object with required JWT fields
    const key = {
      type: Deno.env.get("GOOGLE_DRIVE_TYPE") || "service_account",
      project_id: projectId,
      private_key_id: Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY_ID") || "",
      private_key: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines if any
      client_email: clientEmail,
      client_id: Deno.env.get("GOOGLE_DRIVE_CLIENT_ID") || "",
      auth_uri: Deno.env.get("GOOGLE_DRIVE_AUTH_URI") || "https://accounts.google.com/o/oauth2/auth",
      token_uri: Deno.env.get("GOOGLE_DRIVE_TOKEN_URI") || "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: Deno.env.get("GOOGLE_DRIVE_AUTH_CERT_URL") || "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: Deno.env.get("GOOGLE_DRIVE_CLIENT_CERT_URL") || "",
      universe_domain: Deno.env.get("GOOGLE_DRIVE_UNIVERSE_DOMAIN") || "googleapis.com"
    };
    
    // Generate JWT token with detailed error logging
    await logEvent(supabase, requestId, 'jwt_generation_started', 'drive-integration', 
      'Generating JWT for Google Drive authentication', {
        category: 'credential'
    });
    
    try {
      const token = await generateJWT(key, requestId, supabase);
      
      await logEvent(supabase, requestId, 'jwt_generation_success', 'drive-integration', 
        'JWT successfully generated', {
          category: 'credential'
      });
      
      return {
        token,
        clientEmail
      };
    } catch (jwtError) {
      await logError(supabase, requestId, 'drive-integration', 'JWT generation failed', 
        jwtError, { category: 'credential', severity: 'critical' });
      throw jwtError;
    }
  } catch (e) {
    // This will be caught by the outer try-catch and logged there
    console.error("Error creating Drive client:", e);
    throw new Error(`Failed to initialize Google Drive client: ${e.message}`);
  }
}

// Generate JWT for Google Drive API authentication with enhanced error logging
async function generateJWT(key, requestId, supabase) {
  const jwtStartTime = startTimer();
  try {
    await logEvent(supabase, requestId, 'jwt_header_creation', 'drive-integration', 
      'Creating JWT header', { category: 'credential' });
      
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
    
    // Log JWT claim creation (without private data)
    await logEvent(supabase, requestId, 'jwt_claim_created', 'drive-integration', 
      'JWT claim created', { 
        metadata: { 
          issuer: key.client_email,
          audience: claim.aud,
          expiresIn: 3600
        },
        category: 'credential'
    });
    
    // Create the JWT
    const encoder = new TextEncoder();
    const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const claimBase64 = btoa(JSON.stringify(claim)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    
    const signatureInput = `${headerBase64}.${claimBase64}`;
    
    try {
      // Check for valid private key
      if (!key.private_key || typeof key.private_key !== 'string') {
        await logError(supabase, requestId, 'jwt_generation', 'Invalid private key format', 
          new Error(`Invalid private key type: ${typeof key.private_key}`), 
          { category: 'credential', severity: 'critical' });
          
        throw new Error(`Invalid private key: ${typeof key.private_key}`);
      }
      
      // Validate private key format
      if (!key.private_key.includes("-----BEGIN PRIVATE KEY-----")) {
        await logError(supabase, requestId, 'jwt_generation', 'Private key missing BEGIN marker', 
          new Error('Private key is missing BEGIN marker'), 
          { category: 'credential', severity: 'critical' });
          
        throw new Error("Private key is missing BEGIN marker");
      }
      
      if (!key.private_key.includes("-----END PRIVATE KEY-----")) {
        await logError(supabase, requestId, 'jwt_generation', 'Private key missing END marker', 
          new Error('Private key is missing END marker'), 
          { category: 'credential', severity: 'critical' });
          
        throw new Error("Private key is missing END marker");
      }
      
      await logEvent(supabase, requestId, 'key_import_started', 'drive-integration', 
        'Importing private key', { category: 'credential' });
      
      // Import private key
      try {
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
        
        await logEvent(supabase, requestId, 'key_import_success', 'drive-integration', 
          'Private key successfully imported', { category: 'credential' });
        
        // Sign the JWT
        await logEvent(supabase, requestId, 'jwt_signing_started', 'drive-integration', 
          'Signing JWT', { category: 'credential' });
          
        const signature = await crypto.subtle.sign(
          { name: "RSASSA-PKCS1-v1_5" },
          privateKey,
          encoder.encode(signatureInput)
        );
        
        await logEvent(supabase, requestId, 'jwt_signing_success', 'drive-integration', 
          'JWT successfully signed', { category: 'credential' });
        
        // Convert signature to base64url
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
        const jwt = `${signatureInput}.${signatureBase64}`;
        
        // Exchange JWT for access token
        await logEvent(supabase, requestId, 'token_exchange_started', 'drive-integration', 
          'Exchanging JWT for access token', { category: 'credential' });
          
        const tokenStartTime = startTimer();
        
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
        
        // Enhanced error logging - capture and log the response body
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          let errorJson;
          
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            errorJson = { text: errorText };
          }
          
          // Log much more detailed information about the error
          console.error("TOKEN EXCHANGE DETAILED ERROR:", {
            status: tokenResponse.status,
            statusText: tokenResponse.statusText,
            errorResponse: errorJson,
            jwt_header: header,
            jwt_claims: {
              iss: claim.iss,
              scope: claim.scope,
              aud: claim.aud,
              exp: claim.exp,
              iat: claim.iat
            },
            serviceAccountEmail: key.client_email,
            projectId: key.project_id
          });
          
          await logError(supabase, requestId, 'token_exchange', 'Error exchanging JWT for token', 
            new Error(`Token exchange failed with status ${tokenResponse.status}`), { 
              category: 'credential', 
              severity: 'critical',
              metadata: {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                errorResponse: errorJson,
                serviceAccountEmail: key.client_email,
                projectId: key.project_id,
                requestTime: new Date().toISOString()
              }
          });
          
          throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${JSON.stringify(errorJson)}`);
        }
        
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          await logError(supabase, requestId, 'token_exchange', 'No access token in response', 
            new Error('No access_token in token response'), { 
              category: 'credential', 
              severity: 'critical',
              metadata: {
                responseKeys: Object.keys(tokenData),
                hasError: !!tokenData.error,
                errorDescription: tokenData.error_description
              }
          });
          
          throw new Error(`Failed to obtain access token: ${JSON.stringify(tokenData)}`);
        }
        
        await logEvent(supabase, requestId, 'token_exchange_success', 'drive-integration', 
          'Successfully obtained access token', { 
            durationMs: calculateDuration(tokenStartTime),
            category: 'credential',
            metadata: {
              tokenType: tokenData.token_type,
              expiresIn: tokenData.expires_in
            }
        });
        
        await logEvent(supabase, requestId, 'jwt_process_complete', 'drive-integration', 
          'JWT authentication process completed', { 
            durationMs: calculateDuration(jwtStartTime),
            category: 'credential'
        });
        
        return tokenData.access_token;
      } catch (keyImportError) {
        await logError(supabase, requestId, 'key_import', 'Error importing private key', 
          keyImportError, { category: 'credential', severity: 'critical' });
        throw keyImportError;
      }
    } catch (e) {
      await logError(supabase, requestId, 'jwt_generation', 'Error generating JWT', 
        e, { category: 'credential', severity: 'critical' });
      throw new Error(`JWT generation failed: ${e.message}`);
    }
  } catch (e) {
    await logError(supabase, requestId, 'jwt_generation', 'Outer error in generateJWT', 
      e, { 
        category: 'credential', 
        severity: 'critical',
        durationMs: calculateDuration(jwtStartTime)
      });
    throw e;
  }
}

// Helper function to convert PEM to ArrayBuffer with detailed validation
function pemToArrayBuffer(pem) {
  try {
    if (!pem || typeof pem !== 'string') {
      throw new Error(`Invalid private key format: ${typeof pem}`);
    }
    
    // Clean the private key - remove any extra whitespace and ensure proper format
    let cleanedPem = pem.trim();
    
    // Check if the key has the BEGIN/END markers
    if (!cleanedPem.includes("-----BEGIN PRIVATE KEY-----")) {
      throw new Error("Private key is missing BEGIN marker");
    }
    if (!cleanedPem.includes("-----END PRIVATE KEY-----")) {
      throw new Error("Private key is missing END marker");
    }
    
    const base64 = cleanedPem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");  // Remove all whitespace, not just newlines
    
    if (!base64) {
      throw new Error("Private key is empty after removing headers");
    }
    
    try {
      const binary = atob(base64);
      const buffer = new Uint8Array(binary.length);
      
      for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
      }
      
      return buffer.buffer;
    } catch (decodeError) {
      throw new Error(`Failed to decode base64 private key: ${decodeError.message}`);
    }
  } catch (e) {
    console.error("Error converting PEM to ArrayBuffer:", e);
    throw new Error(`Private key conversion failed: ${e.message}`);
  }
}

// More detailed serve implementation with better error handling
serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let requestId = 'system';
  const requestStartTime = startTimer();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body with error handling
    let body;
    try {
      body = await req.json();
      requestId = body.requestId || `drive-${Date.now()}`;
    } catch (parseError) {
      await logError(supabase, requestId, 'drive-integration', 'Failed to parse request JSON', 
        parseError, { category: 'validation' });
        
      return new Response(
        JSON.stringify({ 
          error: `Invalid JSON in request: ${parseError.message}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Log the incoming request
    await logEvent(supabase, requestId, 'drive_request_started', 'drive-integration', 
      `Drive integration request: ${body.operation || 'unknown'}`, {
        metadata: {
          operation: body.operation,
          fileId: body.fileId,
          query: body.query,
          limit: body.limit
        },
        category: 'document'
    });

    // Validate operation parameter
    const operation = body.operation;
    if (!operation) {
      await logError(supabase, requestId, 'drive-integration', 'Missing operation in request', 
        new Error('Operation parameter is required'), { category: 'validation' });
        
      return new Response(
        JSON.stringify({ error: "Missing 'operation' parameter" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    try {
      // Create the Drive client with the current request ID
      const clientCreationTime = startTimer();
      
      await logEvent(supabase, requestId, 'drive_client_creation_started', 'drive-integration', 
        'Creating Google Drive client', { category: 'credential' });
        
      const { token } = await createDriveClient(requestId);
      
      await logEvent(supabase, requestId, 'drive_client_creation_complete', 'drive-integration', 
        'Google Drive client created successfully', { 
          durationMs: calculateDuration(clientCreationTime),
          category: 'credential'
      });

      // Handle different operations with detailed logging
      switch (operation) {
        case 'list': {
          const limit = body.limit || 10;
          
          await logEvent(supabase, requestId, 'list_files_started', 'drive-integration', 
            `Listing up to ${limit} files`, { 
              category: 'document',
              metadata: { limit }
          });
          
          const operationStartTime = startTimer();
          
          try {
            const files = await listDriveFiles(token, limit, requestId, supabase);
            
            await logEvent(supabase, requestId, 'list_files_success', 'drive-integration', 
              `Successfully listed ${files.length} files`, { 
                durationMs: calculateDuration(operationStartTime),
                category: 'document',
                metadata: { fileCount: files.length }
            });
            
            return new Response(
              JSON.stringify({ files }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (listError) {
            await logError(supabase, requestId, 'list_files', 'Error listing Drive files', 
              listError, {
                category: 'document',
                severity: 'error',
                durationMs: calculateDuration(operationStartTime)
            });
            
            return new Response(
              JSON.stringify({ error: `Failed to list files: ${listError.message}` }),
              { 
                status: 500, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
        }

        case 'search': {
          const query = body.query;
          const limit = body.limit || 10;
          
          if (!query) {
            await logError(supabase, requestId, 'drive-integration', 'Missing search query', 
              new Error('Search query is required'), { category: 'validation' });
              
            return new Response(
              JSON.stringify({ error: "Missing 'query' parameter for search operation" }),
              { 
                status: 400, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
          
          await logEvent(supabase, requestId, 'search_files_started', 'drive-integration', 
            `Searching for "${query}" with limit ${limit}`, { 
              category: 'document',
              metadata: { query, limit }
          });
          
          const operationStartTime = startTimer();
          
          try {
            const files = await searchDriveFiles(token, query, limit, requestId, supabase);
            
            await logEvent(supabase, requestId, 'search_files_success', 'drive-integration', 
              `Search returned ${files.length} results for "${query}"`, { 
                durationMs: calculateDuration(operationStartTime),
                category: 'document',
                metadata: { 
                  resultCount: files.length,
                  query
                }
            });
            
            return new Response(
              JSON.stringify({ files }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (searchError) {
            await logError(supabase, requestId, 'search_files', 'Error searching Drive files', 
              searchError, {
                category: 'document',
                severity: 'error',
                durationMs: calculateDuration(operationStartTime),
                metadata: { query }
            });
            
            return new Response(
              JSON.stringify({ error: `Failed to search files: ${searchError.message}` }),
              { 
                status: 500, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
        }

        case 'get': {
          const fileId = body.fileId;
          
          if (!fileId) {
            await logError(supabase, requestId, 'drive-integration', 'Missing file ID', 
              new Error('File ID is required'), { category: 'validation' });
              
            return new Response(
              JSON.stringify({ error: "Missing 'fileId' parameter for get operation" }),
              { 
                status: 400, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
          
          await logEvent(supabase, requestId, 'get_file_started', 'drive-integration', 
            `Getting file metadata and content for ID: ${fileId}`, { 
              category: 'document',
              metadata: { fileId }
          });
          
          const operationStartTime = startTimer();
          
          try {
            // First get file metadata
            const fileMetadataTime = startTimer();
            
            await logEvent(supabase, requestId, 'get_file_metadata_started', 'drive-integration', 
              `Fetching metadata for file ${fileId}`, { 
                category: 'document',
                metadata: { fileId }
            });
            
            const fileMetadata = await getFileMetadata(token, fileId, requestId, supabase);
            
            await logEvent(supabase, requestId, 'get_file_metadata_success', 'drive-integration', 
              `Successfully fetched metadata for ${fileMetadata.name}`, { 
                durationMs: calculateDuration(fileMetadataTime),
                category: 'document',
                metadata: { 
                  fileId,
                  fileName: fileMetadata.name,
                  mimeType: fileMetadata.mimeType
                }
            });
            
            // Then get file content
            const fileContentTime = startTimer();
            
            await logEvent(supabase, requestId, 'get_file_content_started', 'drive-integration', 
              `Fetching content for file ${fileId} (${fileMetadata.name})`, { 
                category: 'document',
                metadata: { 
                  fileId,
                  fileName: fileMetadata.name,
                  mimeType: fileMetadata.mimeType
                }
            });
            
            const fileContent = await getFileContent(token, fileId, fileMetadata.mimeType, requestId, supabase);
            
            await logEvent(supabase, requestId, 'get_file_content_success', 'drive-integration', 
              `Successfully fetched content for ${fileMetadata.name}`, { 
                durationMs: calculateDuration(fileContentTime),
                category: 'document',
                metadata: { 
                  fileId,
                  fileName: fileMetadata.name,
                  contentLength: fileContent.content ? fileContent.content.length : 0
                }
            });
            
            // Format file data
            const file = {
              id: fileId,
              name: fileMetadata.name,
              file_type: fileMetadata.mimeType,
              created_at: fileMetadata.createdTime,
              updated_at: fileMetadata.modifiedTime,
              description: fileMetadata.description || "",
              size: fileMetadata.size || 0
            };
            
            await logEvent(supabase, requestId, 'get_file_complete', 'drive-integration', 
              `Successfully retrieved file metadata and content for ${fileMetadata.name}`, { 
                durationMs: calculateDuration(operationStartTime),
                category: 'document'
            });
            
            // Return combined file metadata and content
            return new Response(
              JSON.stringify({ file, content: fileContent }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (getError) {
            await logError(supabase, requestId, 'get_file', 'Error getting Drive file', 
              getError, {
                category: 'document',
                severity: 'error',
                durationMs: calculateDuration(operationStartTime),
                metadata: { fileId }
            });
            
            return new Response(
              JSON.stringify({ error: `Failed to get file: ${getError.message}` }),
              { 
                status: 500, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
        }

        default:
          await logError(supabase, requestId, 'drive-integration', 'Invalid operation', 
            new Error(`Unknown operation: ${operation}`), { category: 'validation' });
            
          return new Response(
            JSON.stringify({ error: `Unknown operation: ${operation}` }),
            { 
              status: 400, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
      }
    } catch (error) {
      // Handle credential-specific errors with detailed diagnostics
      if (error.message?.includes('credential') || 
          error.message?.includes('key') || 
          error.message?.includes('authentication')) {
        
        await logError(supabase, requestId, 'drive-integration', 'Google Drive credentials error', 
          error, { 
            category: 'credential',
            severity: 'critical'
          });
          
        return new Response(
          JSON.stringify({ 
            error: "Google Drive credentials error",
            details: {
              message: error.message,
              type: 'credential_error',
              fixInstructions: "Verify that all Google Drive credential environment variables are correctly configured"
            }
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      // General operation error
      await logError(supabase, requestId, 'drive-integration', 'Error in operation', 
        error, { 
          category: 'document',
          severity: 'error'
        });
        
      return new Response(
        JSON.stringify({ error: `Operation failed: ${error.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    // Top-level error handler
    await logError(supabase, requestId, 'drive-integration', 'Critical error in function', 
      error, { 
        category: 'generic',
        severity: 'critical',
        durationMs: calculateDuration(requestStartTime)
      });
      
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } finally {
    // Log overall request completion regardless of outcome
    await logEvent(supabase, requestId, 'drive_request_complete', 'drive-integration', 
      'Drive integration request completed', {
        durationMs: calculateDuration(requestStartTime),
        category: 'document'
    });
  }
});

// Enhanced function implementation with better error tracking
async function listDriveFiles(token, limit = 10, requestId, supabase) {
  await logEvent(supabase, requestId, 'list_files_api_call', 'drive_api', 
    `Calling Drive API to list ${limit} files`, {
      category: 'document',
      metadata: { limit }
  });
  
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=${limit}&fields=files(id,name,mimeType,createdTime,modifiedTime,description,size)`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { text: errorData };
      }
      
      await logError(supabase, requestId, 'drive_api', 'Drive API error listing files', 
        new Error(`Status ${response.status}: ${response.statusText}`), {
          category: 'document',
          severity: 'error',
          metadata: {
            status: response.status,
            statusText: response.statusText,
            errorData: parsedError
          }
      });
      
      throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.files) {
      await logEvent(supabase, requestId, 'list_files_invalid_response', 'drive_api', 
        'Drive API returned invalid response without files array', {
          category: 'document',
          severity: 'warning',
          metadata: { responseKeys: Object.keys(data) }
      });
      
      return [];
    }
    
    await logEvent(supabase, requestId, 'list_files_api_success', 'drive_api', 
      `Drive API returned ${data.files.length} files`, {
        category: 'document',
        metadata: { fileCount: data.files.length }
    });
    
    return data.files.map(file => ({
      id: file.id,
      name: file.name,
      file_type: file.mimeType,
      description: file.description || "",
      created_at: file.createdTime,
      updated_at: file.modifiedTime,
      size: file.size || 0,
      last_accessed: new Date().toISOString()
    }));
  } catch (error) {
    // Handle network errors
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      await logError(supabase, requestId, 'drive_api', 'Network error listing files', 
        error, {
          category: 'network',
          severity: 'error'
      });
    } else {
      await logError(supabase, requestId, 'drive_api', 'Error listing files', 
        error, {
          category: 'document',
          severity: 'error'
      });
    }
    
    throw error;
  }
}

// Search files in Google Drive with improved error handling
async function searchDriveFiles(token, query, limit = 10, requestId, supabase) {
  // Sanitize the query for API safety
  const sanitizedQuery = query.replace(/'/g, "\\'").trim();
  const q = `name contains '${sanitizedQuery}' or fullText contains '${sanitizedQuery}'`;
  
  await logEvent(supabase, requestId, 'search_files_api_call', 'drive_api', 
    `Calling Drive API to search for "${sanitizedQuery}" with limit ${limit}`, {
      category: 'document',
      metadata: { query: sanitizedQuery, limit }
  });
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&pageSize=${limit}&fields=files(id,name,mimeType,createdTime,modifiedTime,description,size)`, 
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { text: errorData };
      }
      
      await logError(supabase, requestId, 'drive_api', 'Drive API error searching files', 
        new Error(`Status ${response.status}: ${response.statusText}`), {
          category: 'document',
          severity: 'error',
          metadata: {
            status: response.status,
            statusText: response.statusText,
            errorData: parsedError,
            query: sanitizedQuery
          }
      });
      
      throw new Error(`Failed to search files: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.files) {
      await logEvent(supabase, requestId, 'search_files_invalid_response', 'drive_api', 
        'Drive API returned invalid response without files array', {
          category: 'document',
          severity: 'warning',
          metadata: { responseKeys: Object.keys(data), query: sanitizedQuery }
      });
      
      return [];
    }
    
    await logEvent(supabase, requestId, 'search_files_api_success', 'drive_api', 
      `Drive API search returned ${data.files.length} files for "${sanitizedQuery}"`, {
        category: 'document',
        metadata: { 
          fileCount: data.files.length,
          query: sanitizedQuery
        }
    });
    
    return data.files.map(file => ({
      id: file.id,
      name: file.name,
      file_type: file.mimeType,
      description: file.description || "",
      created_at: file.createdTime,
      updated_at: file.modifiedTime,
      size: file.size || 0,
      last_accessed: new Date().toISOString()
    }));
  } catch (error) {
    // Handle network errors
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      await logError(supabase, requestId, 'drive_api', 'Network error searching files', 
        error, {
          category: 'network',
          severity: 'error',
          metadata: { query: sanitizedQuery }
      });
    } else {
      await logError(supabase, requestId, 'drive_api', 'Error searching files', 
        error, {
          category: 'document',
          severity: 'error',
          metadata: { query: sanitizedQuery }
      });
    }
    
    throw error;
  }
}

// Get file metadata from Google Drive
async function getFileMetadata(token, fileId, requestId, supabase) {
  await logEvent(supabase, requestId, 'file_metadata_api_call', 'drive_api', 
    `Calling Drive API to get metadata for file ${fileId}`, {
      category: 'document',
      metadata: { fileId }
  });
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,createdTime,modifiedTime,description,size`, 
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { text: errorData };
      }
      
      // Handle 404 specifically
      if (response.status === 404) {
        await logError(supabase, requestId, 'drive_api', `File not found: ${fileId}`, 
          new Error(`File not found: ${fileId}`), {
            category: 'document',
            severity: 'warning',
            metadata: { fileId }
        });
        
        throw new Error(`File not found: ${fileId}`);
      }
      
      await logError(supabase, requestId, 'drive_api', 'Drive API error getting file metadata', 
        new Error(`Status ${response.status}: ${response.statusText}`), {
          category: 'document',
          severity: 'error',
          metadata: {
            status: response.status,
            statusText: response.statusText,
            errorData: parsedError,
            fileId
          }
      });
      
      throw new Error(`Failed to get file metadata: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.id || !data.name) {
      await logEvent(supabase, requestId, 'file_metadata_invalid_response', 'drive_api', 
        'Drive API returned invalid metadata response', {
          category: 'document',
          severity: 'warning',
          metadata: { 
            responseKeys: Object.keys(data),
            fileId 
          }
      });
      
      throw new Error(`Invalid metadata response for file: ${fileId}`);
    }
    
    await logEvent(supabase, requestId, 'file_metadata_api_success', 'drive_api', 
      `Successfully retrieved metadata for file: ${data.name}`, {
        category: 'document',
        metadata: { 
          fileId,
          fileName: data.name,
          mimeType: data.mimeType
        }
    });
    
    return data;
  } catch (error) {
    // Handle network errors
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      await logError(supabase, requestId, 'drive_api', 'Network error getting file metadata', 
        error, {
          category: 'network',
          severity: 'error',
          metadata: { fileId }
      });
    } else {
      await logError(supabase, requestId, 'drive_api', 'Error getting file metadata', 
        error, {
          category: 'document',
          severity: 'error',
          metadata: { fileId }
      });
    }
    
    throw error;
  }
}

// Get file content from Google Drive
async function getFileContent(token, fileId, mimeType, requestId, supabase) {
  await logEvent(supabase, requestId, 'file_content_api_call', 'drive_api', 
    `Calling Drive API to get content for file ${fileId}`, {
      category: 'document',
      metadata: { 
        fileId,
        mimeType 
      }
  });
  
  try {
    // Determine export format based on mimeType
    const isGoogleDoc = mimeType?.includes('application/vnd.google-apps');
    
    let url;
    let exportFormat;
    
    if (isGoogleDoc) {
      // Export Google Documents as plain text
      if (mimeType === 'application/vnd.google-apps.document') {
        exportFormat = 'text/plain';
        url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportFormat)}`;
      } 
      // Export Google Spreadsheets as CSV
      else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        exportFormat = 'text/csv';
        url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportFormat)}`;
      }
      // Export Google Slides as plain text
      else if (mimeType === 'application/vnd.google-apps.presentation') {
        exportFormat = 'text/plain';
        url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportFormat)}`;
      }
      // For other Google formats, try text export
      else {
        exportFormat = 'text/plain';
        url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportFormat)}`;
      }
      
      await logEvent(supabase, requestId, 'file_export_format', 'drive_api', 
        `Exporting Google file as ${exportFormat}`, {
          category: 'document',
          metadata: { 
            fileId,
            originalMimeType: mimeType,
            exportFormat
          }
      });
    } else {
      // Direct download for non-Google docs
      url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      
      await logEvent(supabase, requestId, 'file_download_direct', 'drive_api', 
        `Downloading non-Google file directly`, {
          category: 'document',
          metadata: { 
            fileId,
            mimeType
          }
      });
    }

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { text: errorData };
      }
      
      await logError(supabase, requestId, 'drive_api', 'Drive API error getting file content', 
        new Error(`Status ${response.status}: ${response.statusText}`), {
          category: 'document',
          severity: 'error',
          metadata: {
            status: response.status,
            statusText: response.statusText,
            errorData: parsedError,
            fileId,
            isGoogleDoc,
            exportFormat: exportFormat || 'none'
          }
      });
      
      throw new Error(`Failed to get file content: ${response.status} ${response.statusText}`);
    }
    
    // Get content as text
    const content = await response.text();
    
    // Handle empty content
    if (!content) {
      await logEvent(supabase, requestId, 'file_content_empty', 'drive_api', 
        'Drive API returned empty file content', {
          category: 'document',
          severity: 'warning',
          metadata: { 
            fileId,
            mimeType,
            isGoogleDoc
          }
      });
    }
    
    await logEvent(supabase, requestId, 'file_content_api_success', 'drive_api', 
      `Successfully retrieved content for file: ${fileId}`, {
        category: 'document',
        metadata: { 
          fileId,
          contentLength: content.length,
          isGoogleDoc,
          exportFormat: exportFormat || 'none'
        }
    });
    
    return {
      content,
      exportFormat: exportFormat || null
    };
  } catch (error) {
    // Handle network errors
    if (error.message?.includes('fetch') || error.name === 'TypeError') {
      await logError(supabase, requestId, 'drive_api', 'Network error getting file content', 
        error, {
          category: 'network',
          severity: 'error',
          metadata: { fileId, mimeType }
      });
    } else {
      await logError(supabase, requestId, 'drive_api', 'Error getting file content', 
        error, {
          category: 'document',
          severity: 'error',
          metadata: { fileId, mimeType }
      });
    }
    
    throw error;
  }
}
