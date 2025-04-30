
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { OAuth2Client } from 'https://deno.land/x/google_auth@1.5.1/mod.ts';
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

const generateJWT = async () => {
  const privateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
  const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL');
  const scopes = ['https://www.googleapis.com/auth/drive.readonly'];

  const oAuth2Client = new OAuth2Client();
  oAuth2Client.fromJSON({
    type: 'authorized_user',
    client_email: clientEmail,
    private_key: privateKey,
  });

  try {
    const token = await oAuth2Client.signJwt({
      payload: {
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        scope: scopes.join(' '),
      },
    });
    return token;
  } catch (error) {
    console.error('JWT signing error:', error);
    throw new Error('Failed to generate JWT');
  }
};

// Since we can't use googleapis directly due to the module issue,
// we'll implement the functions using direct REST API calls instead
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
    const accessToken = await generateJWT();
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
    const accessToken = await generateJWT();
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
    const accessToken = await generateJWT();
    
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, fileId, query, includeWebLink } = await req.json();
    const sharedDriveId = Deno.env.get('GOOGLE_SHARED_DRIVE_ID');

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
