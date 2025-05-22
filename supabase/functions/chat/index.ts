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

// XAI API key and configuration
const xaiApiKey = Deno.env.get('XAI_API_KEY');
// Updated API endpoint format based on common API standards
const XAI_API_ENDPOINT = "https://api.xai.ai/v1/chat/completions";
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

// Helper function to log debug info
async function logDebugInfo(message: string, data: any, requestId: string) {
  try {
    console.log(message, data);
    
    const { error: dbError } = await supabase
      .from('chat_logs')
      .insert({
        request_id: requestId,
        event_type: 'debug',
        message: message,
        component: 'edge-function',
        severity: 'debug',
        metadata: data
      });
      
    if (dbError) {
      console.error("Failed to log debug info to database:", dbError);
    }
  } catch (logError) {
    console.error("Error during debug logging:", logError);
  }
}

// Helper function for enhanced API response validation
function validateApiResponse(data: any): boolean {
  // Basic structural check
  if (!data) {
    console.error("API response is null or undefined");
    return false;
  }
  
  console.log("Validating API response structure:", JSON.stringify(data));
  
  // More flexible validation to handle different formats
  // Try multiple known response formats
  
  // Format 1: Standard OpenAI-like format
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    if (data.choices[0].message && typeof data.choices[0].message.content === 'string') {
      console.log("Valid response format found (standard choices format)");
      return true;
    }
  }
  
  // Format 2: Direct text response
  if (data.text || data.content) {
    console.log("Valid response format found (direct text format)");
    return true;
  }
  
  // Format 3: Message array format
  if (Array.isArray(data.messages) && data.messages.length > 0) {
    if (typeof data.messages[0].content === 'string') {
      console.log("Valid response format found (message array format)");
      return true;
    }
  }
  
  // Format 4: Completion format (like completion models)
  if (Array.isArray(data.completions) && data.completions.length > 0) {
    if (typeof data.completions[0] === 'string' || typeof data.completions[0].text === 'string') {
      console.log("Valid response format found (completions format)");
      return true;
    }
  }
  
  // No valid format found
  console.error("No valid response format detected in:", data);
  return false;
}

// Helper function to extract text from various response formats
function extractResponseText(data: any): string {
  // Try to extract from different possible response formats
  
  // Format 1: Standard OpenAI-like format
  if (Array.isArray(data.choices) && data.choices.length > 0) {
    if (data.choices[0].message && typeof data.choices[0].message.content === 'string') {
      return data.choices[0].message.content;
    }
  }
  
  // Format 2: Direct text response
  if (typeof data.text === 'string') {
    return data.text;
  }
  if (typeof data.content === 'string') {
    return data.content;
  }
  
  // Format 3: Message array format
  if (Array.isArray(data.messages) && data.messages.length > 0) {
    if (typeof data.messages[0].content === 'string') {
      return data.messages[0].content;
    }
  }
  
  // Format 4: Completion format
  if (Array.isArray(data.completions) && data.completions.length > 0) {
    if (typeof data.completions[0] === 'string') {
      return data.completions[0];
    }
    if (typeof data.completions[0].text === 'string') {
      return data.completions[0].text;
    }
  }
  
  // If we get here, we couldn't extract text - as a fallback use stringified JSON
  console.error("Could not extract response text, using stringified JSON as fallback");
  return `Could not parse response: ${JSON.stringify(data)}`;
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

    // Verify API key exists
    if (!xaiApiKey) {
      console.error("XAI API key is missing or invalid");
      return new Response(
        JSON.stringify({
          error: 'API configuration error: XAI_API_KEY is missing or invalid',
        }),
        {
          status: 500,
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
    console.log(`Using API endpoint: ${XAI_API_ENDPOINT}`);
    console.log(`Request payload: ${JSON.stringify(requestPayload)}`);

    // Log API key length (for debugging, never log the actual key)
    console.log(`API key provided: ${xaiApiKey ? 'Yes' : 'No'}, length: ${xaiApiKey?.length || 0}`);

    // Log the start of XAI API call
    const startTime = Date.now();
    
    try {
      // Debug log the headers and first part of the request
      await logDebugInfo("XAI API Request Headers", {
        contentType: "application/json",
        authType: "Bearer Token",
        requestSize: JSON.stringify(requestPayload).length
      }, requestId);
      
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
      
      // Get the raw text response for debugging
      const responseText = await response.text();
      console.log(`XAI API raw response text: ${responseText}`);
      
      // Check for HTTP errors from XAI API
      if (!response.ok) {
        console.error(`XAI API HTTP error: ${response.status}, Body: ${responseText}`);
        
        // Try to parse error response if possible
        let errorData = responseText;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          // Keep as text if can't parse
        }
        
        await logDebugInfo("XAI API Error Response", {
          status: response.status,
          body: errorData
        }, requestId);
        
        throw new Error(`XAI API error: ${response.status} - ${typeof errorData === 'object' ? JSON.stringify(errorData) : errorData}`);
      }

      // Parse response from XAI (now we need to parse the text we already read)
      let data;
      try {
        data = JSON.parse(responseText);
        console.log(`XAI API parsed response: ${JSON.stringify(data)}`);
      } catch (parseError) {
        console.error(`Error parsing JSON response: ${parseError.message}`);
        await logError(parseError, requestId, 'json_parse');
        throw new Error(`Failed to parse API response as JSON: ${parseError.message}`);
      }
      
      // Validate response format
      if (!validateApiResponse(data)) {
        console.error(`Invalid XAI API response format:`, data);
        await logDebugInfo("Invalid API Response Format", data, requestId);
        throw new Error("Invalid response format from XAI API");
      }
      
      // Extract the assistant's response using our new flexible extractor
      const assistantResponse = extractResponseText(data);
      
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
          tokens_used: data.usage?.total_tokens || 0,
          response_length: assistantResponse.length
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
