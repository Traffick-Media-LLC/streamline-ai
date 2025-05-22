
// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// XAI API key from environment variables
const xaiApiKey = Deno.env.get('XAI_API_KEY');

// Helper function to log errors
async function logError(error: any, requestId: string, stage: string) {
  try {
    console.error(`Error at stage ${stage}:`, error);
    
    // Insert error into the logs table
    const { error: dbError } = await supabase
      .from('chat_logs')
      .insert({
        request_id: requestId,
        event_type: 'error',
        message: JSON.stringify(error),
        stage,
      });
      
    if (dbError) {
      console.error("Failed to log error to database:", dbError);
    }
  } catch (logError) {
    console.error("Error during error logging:", logError);
  }
}

// Main function to handle requests
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const requestData = await req.json();
    const { content, messages, chatId, requestId, useSimpleFormat } = requestData;

    // Check if this is a health check
    if (requestData.mode === 'health_check') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Raw request received: ${JSON.stringify(requestData)}\n`);

    // Basic validation
    if (!content || !messages || !chatId || !requestId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format messages for XAI API
    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Prepare system message
    const systemMessage = {
      role: "system",
      content: "You are a helpful assistant specialized in answering questions about product legality across different states."
    };

    // Add system message at the beginning if not present
    if (formattedMessages.length === 0 || formattedMessages[0].role !== "system") {
      formattedMessages.unshift(systemMessage);
    }

    // Add the latest user message
    formattedMessages.push({
      role: "user",
      content
    });

    // Log the start of XAI API call
    const startTime = Date.now();
    
    try {
      // Call XAI API with the updated model name "grok-3-latest"
      const response = await fetch("https://api.xai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${xaiApiKey}`
        },
        body: JSON.stringify({
          model: "grok-3-latest",  // Updated model name here
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 800
        })
      });

      // Check for errors from XAI API
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`XAI API error: ${response.status} ${errorData}`);
      }

      // Parse response from XAI
      const data = await response.json();
      
      // Safely access the response content with proper error handling
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from XAI API: Missing choices or message");
      }
      
      const assistantResponse = data.choices[0].message.content;
      
      if (!assistantResponse) {
        throw new Error("Empty response from XAI API");
      }
      
      // Log completion time
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      // Create response object
      let result = {
        id: requestId,
        content: assistantResponse,
        role: "assistant",
        createdAt: new Date().toISOString(),
        metadata: {
          model: data.model || "grok-3-latest",  // Updated model name for metadata
          tokensUsed: data.usage?.total_tokens || 0,
          responseTimeMs,
          sourceInfo: {
            found: false,
            source: 'internet_knowledge'
          }
        }
      };

      // Log successful completion
      console.log(`XAI response generated in ${responseTimeMs}ms`);

      return new Response(
        JSON.stringify(result),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (apiError) {
      // Log API call error
      await logError(apiError, requestId, 'xai_api_call');
      
      return new Response(
        JSON.stringify({
          error: `Error calling XAI API: ${apiError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    // Log general processing error
    console.error("General processing error:", error);
    
    return new Response(
      JSON.stringify({
        error: `General error: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
