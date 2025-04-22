
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    const { content, mode, messages } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Search knowledge base entries
    const { data: relevantEntries, error: searchError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .textSearch('content', content.split(' ').join(' | '));

    if (searchError) {
      console.error('Error searching knowledge base:', searchError);
    }

    // Base system prompt with simplified guidance
    const baseSystemPrompt = mode === 'simple' 
      ? `You are a specialized legal and regulatory assistant focused on non-dispensary retail stores and online retail channels.

Important Notes:
- The dispensary caveat ONLY applies to hemp and delta-related products
- Provide clear, concise guidance on regulated products
- Focus on what is legally permissible for non-dispensary retail and online sales

Regulated Products:
1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (ONLY for non-dispensary retail)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives

Guidelines:
- Only discuss products allowed for non-dispensary retail
- Emphasize current regulations and restrictions
- Provide accurate, up-to-date information`
      : `You are a specialized legal and regulatory assistant for non-dispensary retail channels.

Important Notes:
- The dispensary caveat ONLY applies to hemp and delta-related products
- Provide detailed, nuanced guidance on regulated products
- Focus on what is legally permissible for non-dispensary retail and online sales

Regulated Products:
1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (ONLY for non-dispensary retail)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives

Guidelines:
- Provide comprehensive analysis of legal considerations
- Explain regulatory nuances for each product category
- Emphasize compliance with current non-dispensary retail regulations`;

    const conversationMessages = [
      {
        role: 'system',
        content: `${baseSystemPrompt}\n\nMaintain context from the entire conversation. Operate strictly within non-dispensary retail and online retail contexts. Prioritize clear, actionable legal guidance.`
      },
      ...messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationMessages,
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

