
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.33.2";

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_ID = 'org_chart';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Check for admin status
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get the user's JWT
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication error', details: authError }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if the user is an admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('is_admin');
      
    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required', details: roleError }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Step 1: Ensure the bucket exists (this is redundant with our SQL migration but kept for safety)
    let bucketExists = false;
    
    try {
      const { data: bucket, error: bucketError } = await supabase
        .storage
        .getBucket(BUCKET_ID);
        
      bucketExists = !bucketError && bucket;
    } catch (error) {
      console.error("Error checking bucket:", error);
    }
    
    if (!bucketExists) {
      // Create the bucket if it doesn't exist
      const { error: createError } = await supabase
        .storage
        .createBucket(BUCKET_ID, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        
      if (createError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to create bucket',
            details: createError 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage setup completed successfully',
        bucket: BUCKET_ID,
        policies: [
          { name: "Admin users can do everything with org_chart", type: "RLS Policy" },
          { name: "All users can view org_chart files", type: "RLS Policy" }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
