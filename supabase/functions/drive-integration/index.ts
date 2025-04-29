
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Custom GoogleAuth implementation since the original module is not available
class GoogleAuth {
  private credentials: any;
  private scopes: string[];
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor({ credentials, scopes }: { credentials: any, scopes: string[] }) {
    this.credentials = credentials;
    this.scopes = scopes;
  }

  async getAccessToken(): Promise<string> {
    // Check if we have a valid token already
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      // Request a new token using JWT auth
      const now = Math.floor(Date.now() / 1000);
      const expiry = now + 3600; // 1 hour

      const jwtHeader = {
        alg: "RS256",
        typ: "JWT",
        kid: this.credentials.private_key_id
      };

      const jwtClaimSet = {
        iss: this.credentials.client_email,
        scope: this.scopes.join(' '),
        aud: "https://oauth2.googleapis.com/token",
        exp: expiry,
        iat: now
      };

      // Encode the JWT components
      const base64Header = btoa(JSON.stringify(jwtHeader)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const base64ClaimSet = btoa(JSON.stringify(jwtClaimSet)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      // Create the signing input
      const signInput = `${base64Header}.${base64ClaimSet}`;
      
      // Sign the JWT using the private key
      const encoder = new TextEncoder();
      const keyData = this.credentials.private_key;
      
      // Import the private key
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        this._convertPemToBinary(keyData),
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        },
        false,
        ["sign"]
      );
      
      // Sign the data
      const signature = await crypto.subtle.sign(
        { name: "RSASSA-PKCS1-v1_5" },
        privateKey,
        encoder.encode(signInput)
      );
      
      // Convert the signature to base64url
      const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      
      // Assemble the JWT
      const jwt = `${signInput}.${base64Signature}`;
      
      // Exchange the JWT for an access token
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get access token: ${await response.text()}`);
      }
      
      const tokenResponse = await response.json();
      this.token = tokenResponse.access_token;
      this.tokenExpiry = new Date(Date.now() + (tokenResponse.expires_in * 1000));
      
      return this.token;
    } catch (error) {
      console.error("Error getting Google access token:", error);
      throw error;
    }
  }

  // Helper function to convert PEM encoded private key to binary format
  private _convertPemToBinary(pem: string): ArrayBuffer {
    // Remove header, footer, and newlines
    const base64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\n/g, '');
      
    // Decode base64 to binary
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const googleCredentials = Deno.env.get('GOOGLE_DRIVE_CREDENTIALS');
  
  if (!googleCredentials) {
    return new Response(
      JSON.stringify({ error: 'Google Drive credentials not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { operation, fileId, query, limit = 10 } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Handle different operations
    switch (operation) {
      case 'list':
        return await handleListFiles(supabase, limit);
      case 'search':
        return await handleSearchFiles(supabase, query, limit);
      case 'get':
        return await handleGetFile(supabase, fileId);
      case 'sync':
        return await handleSyncDrive(supabase, googleCredentials);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in drive-integration function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// List files from our database cache
async function handleListFiles(supabase, limit) {
  const { data, error } = await supabase
    .from('drive_files')
    .select('*')
    .order('last_accessed', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  
  return new Response(
    JSON.stringify({ files: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Search files in our database cache
async function handleSearchFiles(supabase, query, limit) {
  const { data, error } = await supabase
    .from('drive_files')
    .select('*')
    .textSearch('name', query)
    .order('last_accessed', { ascending: false })
    .limit(limit);

  if (error) {
    // Fallback to simple LIKE query if text search fails
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('drive_files')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('last_accessed', { ascending: false })
      .limit(limit);
      
    if (fallbackError) throw fallbackError;
    
    return new Response(
      JSON.stringify({ files: fallbackData, method: 'fallback' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  return new Response(
    JSON.stringify({ files: data, method: 'textsearch' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Get file content from our database cache
async function handleGetFile(supabase, fileId) {
  // First update the last_accessed timestamp
  await supabase
    .from('drive_files')
    .update({ last_accessed: new Date().toISOString() })
    .eq('id', fileId);
  
  // Then fetch the file content
  const { data, error } = await supabase
    .from('file_content')
    .select('content, processed_at')
    .eq('file_id', fileId)
    .single();
  
  if (error) throw error;
  
  // Also get the file metadata
  const { data: fileData, error: fileError } = await supabase
    .from('drive_files')
    .select('*')
    .eq('id', fileId)
    .single();
    
  if (fileError) throw fileError;
  
  return new Response(
    JSON.stringify({ file: fileData, content: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Sync with Google Drive using the provided credentials
async function handleSyncDrive(supabase, credentialsJson) {
  try {
    const credentials = JSON.parse(credentialsJson);
    
    // Initialize Google Auth with our custom implementation
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly']
    });
    
    // Get access token
    const accessToken = await auth.getAccessToken();
    
    // Fetch files from Google Drive
    const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=files(id,name,mimeType,createdTime,modifiedTime,description,size)&pageSize=100&q=mimeType=\'application/pdf\' or mimeType=\'text/plain\' or mimeType=\'application/vnd.google-apps.document\'', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Google Drive API error: ${response.status} ${errorData}`);
    }
    
    const { files } = await response.json();
    console.log(`Retrieved ${files.length} files from Google Drive`);
    
    // Process and store each file
    const processedFiles = [];
    for (const file of files) {
      // Check if file already exists in our database
      const { data: existingFile } = await supabase
        .from('drive_files')
        .select('id, updated_at')
        .eq('id', file.id)
        .single();
      
      const fileUpdateTime = new Date(file.modifiedTime).toISOString();
      
      // If file exists and hasn't been modified, skip it
      if (existingFile && existingFile.updated_at === fileUpdateTime) {
        processedFiles.push({ id: file.id, name: file.name, status: 'unchanged' });
        continue;
      }
      
      // Prepare file metadata for database
      const fileData = {
        id: file.id,
        name: file.name,
        description: file.description || null,
        file_type: file.mimeType,
        created_at: new Date(file.createdTime).toISOString(),
        updated_at: fileUpdateTime,
        last_accessed: new Date().toISOString(),
        size_bytes: file.size ? parseInt(file.size) : null
      };
      
      // Upsert file metadata
      const { error: upsertError } = await supabase
        .from('drive_files')
        .upsert(fileData, { onConflict: 'id' });
      
      if (upsertError) {
        console.error(`Error upserting file ${file.id}:`, upsertError);
        processedFiles.push({ id: file.id, name: file.name, status: 'error', error: upsertError.message });
        continue;
      }
      
      // Download and process file content if it's PDF or text
      let content = '';
      
      if (file.mimeType === 'text/plain') {
        // Download text file
        const contentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (contentResponse.ok) {
          content = await contentResponse.text();
        } else {
          console.error(`Error downloading content for ${file.id}: ${contentResponse.status}`);
        }
      } else if (file.mimeType === 'application/vnd.google-apps.document') {
        // Export Google Doc as text
        const contentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/plain`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (contentResponse.ok) {
          content = await contentResponse.text();
        } else {
          console.error(`Error exporting Google Doc ${file.id}: ${contentResponse.status}`);
        }
      } else if (file.mimeType === 'application/pdf') {
        // For PDFs, we just store a placeholder since we can't extract text directly in this function
        content = `PDF file: ${file.name}. Content not extracted yet.`;
      }
      
      if (content) {
        // Store content in the database
        const { error: contentError } = await supabase
          .from('file_content')
          .upsert({
            file_id: file.id,
            content: content,
            content_format: 'text',
            content_status: 'processed',
            processed_at: new Date().toISOString(),
            id: crypto.randomUUID()
          }, { onConflict: 'file_id' });
        
        if (contentError) {
          console.error(`Error storing content for ${file.id}:`, contentError);
        }
      }
      
      processedFiles.push({ id: file.id, name: file.name, status: 'updated' });
    }
    
    return new Response(
      JSON.stringify({ 
        message: 'Drive sync completed',
        processed: processedFiles,
        total: files.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in syncing with Google Drive:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync with Google Drive', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
