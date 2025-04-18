
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  try {
    const { content, mode } = await req.json();

    const systemPrompt = mode === 'simple' 
      ? 'You are a legal assistant providing brief, direct answers about regulated industries. Use plain English and only mention legality status and immediate sales restrictions.'
      : 'You are a legal assistant providing detailed breakdowns about regulated industries. Include references to specific laws, regulatory decisions, and external links to legal documents. Start with a TL;DR summary.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          { role: 'user', content }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({ 
        message: data.choices[0].message.content 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Error processing your request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
