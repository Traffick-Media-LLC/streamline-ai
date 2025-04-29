
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        return await handleSyncDrive(supabase);
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

// Sync with Google Drive (placeholder for now)
// In production, this would use the Google Drive API to fetch files
async function handleSyncDrive(supabase) {
  // This is a placeholder. In production, we would:
  // 1. Authenticate with Google using service account credentials
  // 2. List files from the master Drive account
  // 3. Update our database with file metadata
  // 4. Process and cache file contents
  
  // Demo version - just return a message
  return new Response(
    JSON.stringify({ 
      message: 'Drive sync requested',
      note: 'This is a placeholder. In production, this would sync with Google Drive.'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
