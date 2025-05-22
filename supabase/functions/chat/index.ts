
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
const XAI_API_ENDPOINT = "https://api.xai.com/v1/chat/completions";
const MODEL_NAME = "grok-3-latest";

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
        component: 'edge-function',
        severity: 'error',
        metadata: { stage, error_details: error }
      });
      
    if (dbError) {
      console.error("Failed to log error to database:", dbError);
    }
  } catch (logError) {
    console.error("Error during error logging:", logError);
  }
}

// Helper function for enhanced API response validation
function validateApiResponse(data: any): boolean {
  // Check all required properties exist
  if (!data) return false;
  if (!Array.isArray(data.choices)) return false;
  if (data.choices.length === 0) return false;
  if (!data.choices[0].message) return false;
  if (typeof data.choices[0].message.content !== 'string') return false;
  
  return true;
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

    console.log(`Request received for chatId ${chatId}, requestId ${requestId}`);
    console.log(`Message count: ${messages?.length || 0}, Latest content: ${content?.substring(0, 50) || 'none'}...`);

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

    // Construct request payload
    const requestPayload = {
      model: MODEL_NAME,
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 800
    };

    console.log(`Calling XAI API with model: ${MODEL_NAME}`);
    console.log(`Request payload: ${JSON.stringify(requestPayload)}`);

    // Log the start of XAI API call
    const startTime = Date.now();
    
    try {
      // Call XAI API
      const response = await fetch(XAI_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${xaiApiKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      // Log raw response status
      console.log(`XAI API response status: ${response.status}`);
      
      // Check for HTTP errors from XAI API
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`XAI API HTTP error: ${response.status}, Body: ${errorText}`);
        
        throw new Error(`XAI API error: ${response.status} ${errorText}`);
      }

      // Parse response from XAI
      const data = await response.json();
      
      console.log(`XAI API raw response: ${JSON.stringify(data)}`);
      
      // Validate response format
      if (!validateApiResponse(data)) {
        console.error(`Invalid XAI API response format:`, data);
        throw new Error("Invalid response format from XAI API");
      }
      
      const assistantResponse = data.choices[0].message.content;
      
      if (!assistantResponse || assistantResponse.trim() === '') {
        throw new Error("Empty response content from XAI API");
      }
      
      // Log completion time
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      console.log(`XAI response generated successfully in ${responseTimeMs}ms`);

      // Create response object
      let result = {
        id: requestId,
        content: assistantResponse,
        role: "assistant",
        createdAt: new Date().toISOString(),
        metadata: {
          model: data.model || MODEL_NAME,
          tokensUsed: data.usage?.total_tokens || 0,
          responseTimeMs,
          sourceInfo: {
            found: false,
            source: 'internet_knowledge'
          }
        }
      };

      // Log successful completion
      const logData = {
        request_id: requestId,
        chat_id: chatId,
        event_type: 'api_response_success',
        component: 'edge-function',
        message: 'XAI API response successful',
        metadata: {
          model: MODEL_NAME,
          response_time_ms: responseTimeMs,
          tokens_used: data.usage?.total_tokens || 0
        }
      };
      
      await supabase.from('chat_logs').insert(logData);

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
