
// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to log events with a consistent structure
async function logEvent(requestId: string | undefined, component: string, eventType: string, message: string, metadata: any = {}, severity: string = 'log', category: string = 'document') {
  const timestamp = Date.now();
  console[severity](`[${requestId || 'unknown'}][${component}][${eventType}][${category}] ${message}`, metadata);
  
  try {
    // Additional server-side logging could be implemented here
  } catch (error) {
    // Silently fail if logging fails - don't block operations
    console.error("Error in logging system:", error);
  }
}

// Helper function to log errors with a consistent structure
async function logError(requestId: string | undefined, component: string, message: string, error: any, metadata: any = {}, severity: string = 'error', category: string = 'document') {
  // Format error details for logging
  const errorDetails = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    name: error?.name,
    code: error?.code,
    status: error?.status,
    statusText: error?.statusText,
    ...metadata
  };
  
  console.error(`[${requestId || 'unknown'}][${component}][error][${category}] ${message}`, errorDetails);
  
  try {
    // Additional server-side error logging could be implemented here
  } catch (logError) {
    // Silently fail if logging fails
    console.error("Error logging error:", logError);
  }
}

// Function to generate a JWT for Google API authentication
async function generateJWT(requestId: string | undefined) {
  try {
    // Log the start of JWT generation
    await logEvent(requestId, 'drive-integration', 'jwt_generation_started', 'Generating JWT for Google Drive authentication', { timestamp: Date.now() }, 'log', 'credential');

    // Get service account credentials from environment
    const clientEmail = Deno.env.get("GOOGLE_DRIVE_CLIENT_EMAIL");
    const privateKey = Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY");
    const projectId = Deno.env.get("GOOGLE_DRIVE_PROJECT_ID");
    
    // Strip any extra quotes that might be present in the environment variables
    const cleanClientEmail = clientEmail?.replace(/^["']|["']$/g, "");
    const cleanProjectId = projectId?.replace(/^["']|["']$/g, "");

    // Validate credentials and print more detailed debug info
    await logEvent(
      requestId, 
      'drive-integration', 
      'drive_credential_validation', 
      'Validating Google Drive credentials', 
      { 
        hasClientEmail: !!cleanClientEmail, 
        hasPrivateKey: !!privateKey, 
        hasProjectId: !!cleanProjectId, 
        clientEmailDomain: cleanClientEmail?.split('@')[1] || 'missing',
        privateKeyLength: privateKey?.length || 0,
        privateKeyStart: privateKey?.substring(0, 20) || 'missing',
        clientEmailValue: cleanClientEmail || 'missing',
        projectIdValue: cleanProjectId || 'missing'
      }, 
      'log', 
      'credential'
    );

    if (!cleanClientEmail || !privateKey || !cleanProjectId) {
      throw new Error('Google Drive credentials not configured correctly');
    }

    // Log successful credential loading
    await logEvent(
      requestId, 
      'drive-integration', 
      'drive_credentials_valid', 
      'Successfully loaded Google Drive credentials',
      { 
        clientEmail: cleanClientEmail, 
        projectId: cleanProjectId
      }, 
      'log', 
      'credential'
    );

    // Create JWT header
    await logEvent(requestId, 'drive-integration', 'jwt_header_creation', 'Creating JWT header', { timestamp: Date.now() }, 'log', 'credential');
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));

    // Create JWT claim
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour
    
    await logEvent(
      requestId, 
      'drive-integration', 
      'jwt_claim_created', 
      'JWT claim created',
      { 
        issuer: cleanClientEmail, 
        audience: 'https://oauth2.googleapis.com/token',
        expiresIn
      }, 
      'log', 
      'credential'
    );

    const claim = {
      iss: cleanClientEmail,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + expiresIn,
      iat: now
    };
    const encodedClaim = btoa(JSON.stringify(claim));

    // Import the private key for signing
    await logEvent(requestId, 'drive-integration', 'key_import_started', 'Importing private key', { timestamp: Date.now() }, 'log', 'credential');
    
    // Fix and clean private key - ensure it's in the correct format
    let cleanPrivateKey = privateKey || "";
    
    // Log the private key format for debugging
    await logEvent(
      requestId,
      'drive-integration',
      'private_key_format',
      'Checking private key format',
      {
        containsBeginMarker: cleanPrivateKey.includes("-----BEGIN PRIVATE KEY-----"),
        containsEndMarker: cleanPrivateKey.includes("-----END PRIVATE KEY-----"),
        containsEscapedNewlines: cleanPrivateKey.includes("\\n"),
        length: cleanPrivateKey.length,
        firstChars: cleanPrivateKey.substring(0, 20).replace(/\n/g, "\\n")
      },
      'log',
      'credential'
    );
    
    // Remove any extra quotes from the beginning and end
    cleanPrivateKey = cleanPrivateKey.replace(/^["']|["']$/g, "");
    
    // Replace escaped newlines with actual newlines if needed
    cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, "\n");
    
    // Ensure the private key has the proper PEM format
    if (!cleanPrivateKey.includes("-----BEGIN PRIVATE KEY-----")) {
      cleanPrivateKey = "-----BEGIN PRIVATE KEY-----\n" + cleanPrivateKey;
    }
    
    if (!cleanPrivateKey.includes("-----END PRIVATE KEY-----")) {
      cleanPrivateKey = cleanPrivateKey + "\n-----END PRIVATE KEY-----";
    }
    
    try {
      const key = await crypto.subtle.importKey(
        'pkcs8',
        new TextEncoder().encode(cleanPrivateKey),
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );
      
      await logEvent(requestId, 'drive-integration', 'key_import_success', 'Private key successfully imported', { timestamp: Date.now() }, 'log', 'credential');

      // Sign the JWT
      await logEvent(requestId, 'drive-integration', 'jwt_signing_started', 'Signing JWT', { timestamp: Date.now() }, 'log', 'credential');
      
      const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        key,
        new TextEncoder().encode(encodedHeader + '.' + encodedClaim)
      );
      
      const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      await logEvent(requestId, 'drive-integration', 'jwt_signing_success', 'JWT successfully signed', { timestamp: Date.now() }, 'log', 'credential');

      // Create the complete JWT
      const jwt = encodedHeader + '.' + encodedClaim + '.' + encodedSignature;

      // Exchange JWT for access token
      await logEvent(requestId, 'drive-integration', 'token_exchange_started', 'Exchanging JWT for access token', { timestamp: Date.now() }, 'log', 'credential');
      
      const tokenEndpoint = 'https://oauth2.googleapis.com/token';
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      // Check if token exchange was successful
      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({}));
        
        // Log detailed error for debugging
        console.error("TOKEN EXCHANGE DETAILED ERROR:", {
          status: response.status,
          statusText: response.statusText,
          errorResponse,
          jwt_header: header,
          jwt_claims: claim,
          serviceAccountEmail: cleanClientEmail,
          projectId: cleanProjectId,
        });
        
        await logError(
          requestId,
          'token_exchange',
          'Error exchanging JWT for token',
          { message: `Token exchange failed with status ${response.status}` },
          {},
          'error',
          'credential'
        );
        
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorResponse)}`);
      }

      const tokenData = await response.json();
      return tokenData.access_token;
    } catch (keyImportError) {
      await logError(
        requestId,
        'jwt_generation',
        'Error importing private key',
        keyImportError,
        {
          keyFormat: {
            length: cleanPrivateKey.length,
            beginsWith: cleanPrivateKey.substring(0, 30),
            hasBeginMarker: cleanPrivateKey.includes("-----BEGIN PRIVATE KEY-----"),
            hasEndMarker: cleanPrivateKey.includes("-----END PRIVATE KEY-----")
          }
        },
        'error',
        'credential'
      );
      
      throw new Error(`Private key import failed: ${keyImportError.message}`);
    }
  } catch (error) {
    await logError(
      requestId,
      'jwt_generation',
      'Error generating JWT',
      error,
      {},
      'error',
      'credential'
    );
    
    // Rethrow the error for handling up the chain
    throw new Error(`JWT generation failed: ${error.message}`);
  }
}

// Create a Google Drive client with authentication
async function createDriveClient(requestId: string | undefined) {
  await logEvent(requestId, 'drive-integration', 'drive_client_creation_started', 'Creating Google Drive client', { timestamp: Date.now() }, 'log', 'credential');
  
  try {
    // Generate access token
    const accessToken = await generateJWT(requestId);
    
    // Return a client object with methods for interacting with Google Drive
    return {
      // Search for files in Google Drive
      async searchFiles(query: string, maxResults: number = 10) {
        const searchQuery = encodeURIComponent(query);
        const fields = encodeURIComponent('files(id,name,mimeType,description,modifiedTime,webViewLink,thumbnailLink)');
        
        await logEvent(
          requestId,
          'drive-integration',
          'drive_search_files',
          `Searching files with query: ${query}`,
          { query, maxResults },
          'log',
          'document'
        );
        
        try {
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&fields=${fields}&pageSize=${maxResults}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            await logError(
              requestId,
              'drive-integration',
              'Drive search failed',
              { 
                status: response.status,
                statusText: response.statusText,
                error: errorText 
              },
              { query, endpoint: 'files' },
              'error',
              'document'
            );
            
            throw new Error(`Drive search failed: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const data = await response.json();
          
          await logEvent(
            requestId,
            'drive-integration',
            'drive_search_complete',
            `Search completed, found ${data.files?.length || 0} files`,
            { fileCount: data.files?.length || 0 },
            'log',
            'document'
          );
          
          return data;
        } catch (error) {
          await logError(
            requestId,
            'drive-integration',
            'Search files error',
            error,
            { query },
            'error',
            'document'
          );
          throw error;
        }
      },
      
      // Get a specific file's metadata and content
      async getFile(fileId: string) {
        // First get file metadata
        await logEvent(
          requestId,
          'drive-integration',
          'drive_get_file',
          `Getting file metadata for ID: ${fileId}`,
          { fileId },
          'log',
          'document'
        );
        
        try {
          const metadataResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,description,fileExtension,size,modifiedTime,webViewLink`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          if (!metadataResponse.ok) {
            const errorText = await metadataResponse.text();
            await logError(
              requestId,
              'drive-integration',
              'Failed to get file metadata',
              { 
                status: metadataResponse.status,
                statusText: metadataResponse.statusText,
                error: errorText 
              },
              { fileId },
              'error',
              'document'
            );
            throw new Error(`Failed to get file metadata: ${metadataResponse.status} ${metadataResponse.statusText} - ${errorText}`);
          }

          const file = await metadataResponse.json();
          
          // Then get the file content
          await logEvent(
            requestId,
            'drive-integration',
            'drive_get_content',
            `Getting content for file: ${file.name}`,
            { fileId, fileName: file.name },
            'log',
            'document'
          );
          
          const contentResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          if (!contentResponse.ok) {
            const errorText = await contentResponse.text();
            await logError(
              requestId,
              'drive-integration',
              'Failed to get file content',
              { 
                status: contentResponse.status,
                statusText: contentResponse.statusText,
                error: errorText 
              },
              { fileId, fileName: file.name },
              'error',
              'document'
            );
            throw new Error(`Failed to get file content: ${contentResponse.status} ${contentResponse.statusText} - ${errorText}`);
          }

          const content = await contentResponse.text();
          
          // Determine file type for proper processing
          const fileType = file.mimeType || 'unknown';
          
          await logEvent(
            requestId,
            'drive-integration',
            'drive_file_retrieved',
            `Successfully retrieved file: ${file.name}`,
            { fileId, fileName: file.name, fileType, contentLength: content.length },
            'log',
            'document'
          );
          
          return {
            file: {
              ...file,
              file_type: fileType,
              last_accessed: new Date().toISOString()
            },
            content: {
              content,
              type: fileType
            }
          };
        } catch (error) {
          await logError(
            requestId,
            'drive-integration',
            'Get file error',
            error,
            { fileId },
            'error',
            'document'
          );
          throw error;
        }
      },
      
      // List files in Google Drive
      async listFiles(limit: number = 10) {
        const fields = encodeURIComponent('files(id,name,mimeType,description,modifiedTime,webViewLink,thumbnailLink)');
        
        await logEvent(
          requestId,
          'drive-integration',
          'drive_list_files',
          `Listing files (limit: ${limit})`,
          { limit },
          'log',
          'document'
        );
        
        try {
          // First try with a more specific request to check permissions
          const testResponse = await fetch(
            `https://www.googleapis.com/drive/v3/about?fields=user`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );
          
          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            await logError(
              requestId,
              'drive-integration',
              'Permission test failed',
              { 
                status: testResponse.status,
                statusText: testResponse.statusText,
                error: errorText 
              },
              { endpoint: 'about' },
              'error',
              'permission'
            );
            throw new Error(`Permission check failed: ${testResponse.status} ${testResponse.statusText} - ${errorText}`);
          }
          
          const aboutData = await testResponse.json();
          
          await logEvent(
            requestId,
            'drive-integration',
            'drive_permission_check',
            `Permission check passed`,
            { user: aboutData.user },
            'log',
            'permission'
          );
        
          const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?fields=${fields}&pageSize=${limit}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            let errorJson;
            
            try {
              errorJson = JSON.parse(errorText);
            } catch (e) {
              // If parsing fails, just use the text
              errorJson = { error: errorText };
            }
            
            await logError(
              requestId,
              'drive-integration',
              'Failed to list files',
              { 
                status: response.status,
                statusText: response.statusText,
                error: errorJson
              },
              { endpoint: 'files', limit },
              'error',
              'document'
            );
            
            throw new Error(`Failed to list files: ${response.status} ${response.statusText} - ${JSON.stringify(errorJson)}`);
          }

          const data = await response.json();
          
          await logEvent(
            requestId,
            'drive-integration',
            'drive_list_complete',
            `List files completed, found ${data.files?.length || 0} files`,
            { fileCount: data.files?.length || 0 },
            'log',
            'document'
          );
          
          // Format the response to include last_accessed and file_type
          return {
            files: data.files.map((file: any) => ({
              id: file.id,
              name: file.name,
              file_type: file.mimeType || 'unknown',
              description: file.description || null,
              last_accessed: new Date().toISOString(),
              webViewLink: file.webViewLink,
              thumbnailLink: file.thumbnailLink
            }))
          };
        } catch (error) {
          await logError(
            requestId,
            'drive-integration',
            'List files error',
            error,
            { limit },
            'error',
            'document'
          );
          throw error;
        }
      }
    };
  } catch (error) {
    await logError(
      requestId,
      'drive-integration',
      'Error in creating Drive client',
      error,
      {},
      'error',
      'credential'
    );
    
    throw new Error(`Failed to initialize Google Drive client: ${error.message}`);
  }
}

// Main handler for all Drive operations
serve(async (req) => {
  const requestId = req.headers.get('x-request-id') || undefined;
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Log the start of the request
    const requestStartTime = Date.now();
    
    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      await logError(requestId, 'drive-integration', 'Invalid request body', error, {}, 'error', 'request');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { operation, fileId, query, limit, debug, test_credentials } = body;
    
    // Log the request details
    await logEvent(
      requestId, 
      'drive-integration', 
      'drive_request_started', 
      `Drive integration request: ${operation}`, 
      { operation, fileId, query, limit, timestamp: Date.now() },
      'log',
      'document'
    );
    
    if (operation === 'health_check' && debug) {
      // Detailed health check that returns credential status info
      const credentialStatus = {
        clientEmailExists: !!Deno.env.get("GOOGLE_DRIVE_CLIENT_EMAIL"),
        privateKeyExists: !!Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY"),
        projectIdExists: !!Deno.env.get("GOOGLE_DRIVE_PROJECT_ID"),
        clientEmail: Deno.env.get("GOOGLE_DRIVE_CLIENT_EMAIL")?.replace(/^["']|["']$/g, "") || 'missing',
        projectId: Deno.env.get("GOOGLE_DRIVE_PROJECT_ID")?.replace(/^["']|["']$/g, "") || 'missing',
        privateKeyLength: Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY")?.length || 0,
        privateKeyHasBeginMarker: Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY")?.includes("-----BEGIN PRIVATE KEY-----") || false,
        privateKeyHasEndMarker: Deno.env.get("GOOGLE_DRIVE_PRIVATE_KEY")?.includes("-----END PRIVATE KEY-----") || false
      };
      
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'Drive integration is configured',
          detail: 'Detailed credential check completed',
          credentialStatus: credentialStatus
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create Drive client
    let driveClient;
    try {
      if (test_credentials) {
        // Just try to generate a JWT to test credentials
        await generateJWT(requestId);
        
        return new Response(
          JSON.stringify({ 
            status: 'ok', 
            message: 'Credentials validated successfully' 
          }), 
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      driveClient = await createDriveClient(requestId);
    } catch (error) {
      // Return a more user-friendly error with debugging info
      let userMessage = 'Failed to connect to Google Drive. Please check your credentials and try again.';
      let status = 500;
      let errorDetails = { message: error.message };
      
      // Determine if this is a credential error
      const isCredentialError = error.message.includes('credentials') || 
                              error.message.includes('JWT') || 
                              error.message.includes('token');
      
      if (isCredentialError) {
        userMessage = 'Google Drive credentials are invalid or incorrectly configured.';
        status = 401;
        errorDetails = { 
          message: userMessage,
          credentialError: true,
          details: error.message
        };
      }
      
      await logError(requestId, 'drive-integration', 'Error in operation', error, { operation }, 'error', 'document');
      
      return new Response(
        JSON.stringify({ error: userMessage, details: debug ? errorDetails : undefined }), 
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process different operations
    let result;
    try {
      switch (operation) {
        case 'search':
          if (!query) {
            throw new Error('Search query is required');
          }
          result = await driveClient.searchFiles(query, limit || 10);
          break;
        
        case 'get':
          if (!fileId) {
            throw new Error('File ID is required');
          }
          result = await driveClient.getFile(fileId);
          break;
        
        case 'list':
          result = await driveClient.listFiles(limit || 10);
          break;
        
        case 'health_check':
          // Simple health check operation
          result = { status: 'ok', message: 'Drive integration is operational' };
          break;
          
        case 'test_permissions':
          // Test specific API permissions and endpoints
          try {
            // Try the about endpoint which requires less permissions
            const accessToken = await generateJWT(requestId);
            const testResponse = await fetch(
              `https://www.googleapis.com/drive/v3/about?fields=user,storageQuota`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            );
            
            if (!testResponse.ok) {
              throw new Error(`About API failed: ${testResponse.status} ${testResponse.statusText}`);
            }
            
            const aboutData = await testResponse.json();
            
            result = { 
              status: 'ok', 
              message: 'Google Drive permissions test passed',
              user: aboutData.user,
              quota: aboutData.storageQuota
            };
          } catch (error) {
            throw new Error(`Permissions test failed: ${error.message}`);
          }
          break;
          
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      await logError(
        requestId, 
        'drive-integration', 
        `Error in operation: ${operation}`, 
        error, 
        { operation, fileId, query },
        'error',
        'document'
      );
      
      // Enhanced error response with more details for debugging
      const enhancedError = {
        error: error.message,
        operation: operation,
        details: null
      };
      
      // For list operation errors, add more context
      if (operation === 'list') {
        enhancedError.details = 'This may be due to permission issues or the service account not having access to any files.';
      }
      
      return new Response(
        JSON.stringify(enhancedError), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Log the successful completion
    await logEvent(
      requestId, 
      'drive-integration', 
      'drive_request_complete', 
      'Drive integration request completed', 
      { timestamp: Date.now() },
      'log',
      'document'
    );
    
    // Return the result
    return new Response(
      JSON.stringify(result), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // Log any uncaught errors
    console.error(`[${requestId || 'unknown'}] Uncaught error:`, error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
