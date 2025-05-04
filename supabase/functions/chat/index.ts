
// Import required Deno modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to log events in the edge function
async function logEvent(supabase, requestId, eventType, component, message, metadata = {}) {
  try {
    const { error } = await supabase.from('chat_logs').insert({
      request_id: requestId,
      event_type: eventType,
      component,
      message,
      metadata
    });
    
    if (error) {
      console.error('Error logging chat event:', error);
    }
  } catch (err) {
    console.error('Exception logging chat event:', err);
  }
}

// Main server function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const requestTime = new Date();
    const { message, chatId, chatHistory, requestId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Use the Supabase JS client in Deno
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await logEvent(supabase, requestId, 'chat_request_received', 'chat_function', 'Chat request received', {
      chatId,
      hasHistory: chatHistory && chatHistory.length > 0
    });
    
    // Prepare messages for OpenAI
    let messages = [];
    
    // Add system prompt
    const baseSystemPrompt = `You are the AI assistant for Streamline Group Employees inside the Streamline Group Portal. 

Your role is to intelligently answer employee questions about product legality, information about Streamline Group's products, employee resources, and company documents.

Follow this strict source hierarchy based on the type of question:

1. If the user asks about product legality or regulatory status by state (e.g., "Is Delta-8 legal in Texas?"), you must check and pull from the Supabase backend database that powers the U.S. State Map.
2. If the user asks general questions about company information (e.g., "What brands does Streamline sell?" or "Where can I find the marketing request form?"), reference the AI Knowledge Base first.

Always cite your sources where appropriate (e.g., 'According to the State Map data...' or 'Based on the Knowledge Base...').

Answer in a professional, clear, and helpful tone. If you cannot find an answer from the available sources, politely let the user know and suggest submitting a request via the Marketing Request Form or contacting the appropriate department.`;

    messages.push({
      role: "system",
      content: baseSystemPrompt
    });
    
    // Add chat history if available
    if (chatHistory && chatHistory.length > 0) {
      // Format chat history for OpenAI context
      messages = messages.concat(
        chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      );
      
      await logEvent(supabase, requestId, 'chat_history_processed', 'chat_function', 
        `Processed ${chatHistory.length} chat history messages`);
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: message
    });
    
    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    // Special mode for health check
    if (req.json && req.json.mode === "health_check") {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Call OpenAI API
    await logEvent(supabase, requestId, 'openai_request_started', 'chat_function', 
      'Sending request to OpenAI');
      
    const openaiStartTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    const responseTime = Date.now() - openaiStartTime;
    
    if (!response.ok) {
      const error = await response.text();
      await logEvent(supabase, requestId, 'openai_request_failed', 'chat_function', 
        `OpenAI request failed: ${error}`, { status: response.status });
        
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    
    await logEvent(supabase, requestId, 'openai_response_received', 'chat_function', 
      'Received response from OpenAI', { 
        responseTime, 
        tokens: data.usage?.total_tokens || 0,
        model: data.model
      });
    
    // Respond with the AI assistant's message and metadata
    return new Response(
      JSON.stringify({
        message: data.choices[0].message.content,
        model: data.model,
        tokensUsed: data.usage?.total_tokens || 0,
        responseTime
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
    
  } catch (error) {
    console.error('Error processing chat request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Error processing your request: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
