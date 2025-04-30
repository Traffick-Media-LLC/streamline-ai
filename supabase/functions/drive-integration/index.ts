import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getMimeTypeLabel = (mimeType) => {
  switch (mimeType) {
    case 'application/pdf':
      return 'PDF';
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Word Document';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'Excel Spreadsheet';
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return 'PowerPoint Presentation';
    case 'image/jpeg':
    case 'image/png':
    case 'image/gif':
      return 'Image';
    default:
      return 'File';
  }
};

// Generate JWT token for Google OAuth
const generateJWT = async () => {
  try {
    // Get environment variables
    const privateKey = Deno.env.get('GOOGLE_DRIVE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    const clientEmail = Deno.env.get('GOOGLE_DRIVE_CLIENT_EMAIL');
    
    if (!privateKey || !clientEmail) {
      console.error("Missing Google Drive credentials:", {
        hasPrivateKey: !!privateKey,
        hasClientEmail: !!clientEmail
      });
      
      throw new Error('Google Drive credentials not configured. Please set GOOGLE_DRIVE_PRIVATE_KEY and GOOGLE_DRIVE_CLIENT_EMAIL in Supabase secrets.');
    }
    
    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };
    
    // Encode the payload to base64
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // Create the JWT header
    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header));
    
    // Create the content to sign
    const signContent = `${encodedHeader}.${encodedPayload}`;
    
    // Convert private key to format usable by SubtleCrypto
    const privateKeyBuffer = new TextEncoder().encode(privateKey);
    
    // Import the private key
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    
    // Sign the content
    const signature = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      cryptoKey,
      new TextEncoder().encode(signContent)
    );
    
    // Convert signature to base64 and create the final JWT
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const token = `${signContent}.${base64Signature}`;
    
    return token;
  } catch (error) {
    console.error('Error generating JWT:', error);
    
    // Better error message for common issues
    if (error.message?.includes('invalid format')) {
      throw new Error('Invalid private key format. Check that GOOGLE_DRIVE_PRIVATE_KEY environment variable is properly formatted with newlines preserved.');
    }
    
    if (error.message?.includes('credentials not configured')) {
      // Pass through our custom error message
      throw error;
    }
    
    throw new Error(`Failed to generate JWT: ${error.message || "Unknown error"}`);
  }
};

// Get OAuth access token using JWT
const getAccessToken = async () => {
  try {
    const jwt = await generateJWT();
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OAuth token error: ${errorData.error}: ${errorData.error_description}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error(`Failed to get access token: ${error.message}`);
  }
};

const extractContent = async (file, accessToken) => {
  try {
    if (file.mime_type === 'application/vnd.google-apps.document') {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/html`, 
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Error exporting Google Doc as HTML:', response.status, response.statusText);
        throw new Error(`Failed to export Google Doc as HTML: ${response.status} ${response.statusText}`);
      }

      const htmlContent = await response.text();
      const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
      const textContent = doc?.body?.textContent || '';

      return {
        type: 'text',
        content: textContent,
      };
    } else if (file.mime_type === 'text/plain') {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, 
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        console.error('Error getting plain text file:', response.status, response.statusText);
        throw new Error(`Failed to get plain text file: ${response.status} ${response.statusText}`);
      }

      const textContent = await response.text();
      return {
        type: 'text',
        content: textContent,
      };
    } else {
      console.warn(`Unsupported MIME type: ${file.mime_type}`);
      return {
        type: 'text',
        content: 'Content extraction not supported for this file type.',
      };
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    throw new Error(`Error extracting content: ${error.message}`);
  }
};

const getFileDetails = async (fileId) => {
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink&supportsAllDrives=true`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.status} ${response.statusText}`);
    }
    
    const file = await response.json();
    
    return {
      id: file.id,
      name: file.name,
      file_type: getMimeTypeLabel(file.mimeType),
      mime_type: file.mimeType,
      webLink: file.webViewLink || file.webContentLink,
      thumbnailLink: file.thumbnailLink
    };
  } catch (error) {
    console.error(`Error getting file details for ${fileId}:`, error);
    throw new Error(`Error getting file details: ${error.message}`);
  }
};

const getFile = async (fileId) => {
  try {
    const accessToken = await getAccessToken();
    const fileDetails = await getFileDetails(fileId);
    const content = await extractContent(fileDetails, accessToken);

    return {
      file: fileDetails,
      content: content,
    };
  } catch (error) {
    console.error(`Error getting file ${fileId}:`, error);
    throw new Error(`Error getting file: ${error.message}`);
  }
};

const searchFiles = async (query, driveId, limit = 10) => {
  try {
    const accessToken = await getAccessToken();
    
    // Build the query string
    let queryString = `name contains '${query}' and trashed = false`;
    if (driveId) {
      queryString += ` and 'me' in readers`;
    }

    // Make the search request
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryString)}` +
      `&fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink)` +
      `&pageSize=${limit}&supportsAllDrives=true&includeItemsFromAllDrives=true` +
      (driveId ? `&corpora=drive&driveId=${driveId}` : ''),
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process and return the files
    return data.files.map(file => ({
      id: file.id,
      name: file.name,
      file_type: getMimeTypeLabel(file.mimeType),
      mime_type: file.mimeType,
      webLink: file.webViewLink || file.webContentLink,
      thumbnailLink: file.thumbnailLink
    }));
  } catch (error) {
    console.error('Error searching files:', error);
    throw new Error(`Error searching files: ${error.message}`);
  }
};

// Health check function for troubleshooting
const healthCheck = async (debug = false) => {
  try {
    const accessToken = await getAccessToken();
    
    // Basic check - just get user info
    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      return {
        status: 'error',
        message: `API returned status ${response.status}: ${errorData}`,
      };
    }
    
    const data = await response.json();
    
    return {
      status: 'success',
      message: 'Google Drive API connection successful',
      user: debug ? data.user : undefined,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      detail: debug ? error.stack : undefined,
    };
  }
};

// Test service account permissions
const testPermissions = async (debug = false) => {
  try {
    const accessToken = await getAccessToken();
    
    // Get user info
    const aboutResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!aboutResponse.ok) {
      const errorData = await aboutResponse.text();
      return {
        status: 'error',
        message: `Failed to get user info: ${errorData}`,
      };
    }
    
    const aboutData = await aboutResponse.json();
    
    // List a few files to check permissions
    const filesResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?pageSize=5&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true', 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!filesResponse.ok) {
      return {
        status: 'warning',
        message: 'Connected to API but could not list files',
        detail: `Status ${filesResponse.status}: ${await filesResponse.text()}`,
        user: aboutData.user,
      };
    }
    
    const filesData = await filesResponse.json();
    const fileCount = filesData.files?.length || 0;
    
    if (fileCount === 0) {
      return {
        status: 'warning',
        message: 'No files found. Check if service account has access to files.',
        user: aboutData.user,
        fileCount: 0,
      };
    }
    
    return {
      status: 'success',
      message: `Successfully listed ${fileCount} files`,
      user: aboutData.user,
      fileCount,
      files: debug ? filesData.files : undefined,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      detail: debug ? error.stack : undefined,
    };
  }
};

// Implement file listing
const listFiles = async (limit = 20, driveId) => {
  try {
    const accessToken = await getAccessToken();
    
    let url = 'https://www.googleapis.com/drive/v3/files' +
      '?fields=files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,createdTime)' +
      `&pageSize=${limit}&orderBy=viewedByMeTime desc` +
      '&supportsAllDrives=true&includeItemsFromAllDrives=true';
      
    if (driveId) {
      url += `&corpora=drive&driveId=${driveId}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process and return the files
    return {
      files: data.files.map(file => ({
        id: file.id,
        name: file.name,
        file_type: getMimeTypeLabel(file.mimeType),
        mime_type: file.mimeType,
        webLink: file.webViewLink || file.webContentLink,
        thumbnailLink: file.thumbnailLink,
        last_accessed: new Date().toISOString(), // Use current time as we're sorting by last viewed
      })),
    };
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error(`Error listing files: ${error.message}`);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, fileId, query, includeWebLink, driveId, debug, test_credentials } = await req.json();
    const sharedDriveId = driveId || Deno.env.get('GOOGLE_SHARED_DRIVE_ID');

    switch (operation) {
      case 'get':
        if (!fileId) {
          return new Response(JSON.stringify({ error: 'fileId is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const fileData = await getFile(fileId);
          return new Response(
            JSON.stringify({ 
              file: {
                ...fileData.file,
                webLink: includeWebLink ? fileData.file.webLink : undefined
              },
              content: fileData.content 
            }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      case 'search':
        if (!query) {
          return new Response(JSON.stringify({ error: 'Query is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          const files = await searchFiles(query, sharedDriveId);
          return new Response(JSON.stringify({ files }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      
      case 'health_check':
        try {
          const result = await healthCheck(debug);
          
          if (test_credentials) {
            // Specifically test the JWT creation with the credentials
            await getAccessToken();
          }
          
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            status: 'error', 
            message: error.message,
            detail: debug ? error.stack : undefined 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      
      case 'test_permissions':
        try {
          const result = await testPermissions(debug);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ 
            status: 'error', 
            message: error.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
      case 'list':
        try {
          const limit = req.limit || 20;
          const result = await listFiles(limit, sharedDriveId);
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

      default:
        return new Response(JSON.stringify({ error: 'Unsupported operation' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
