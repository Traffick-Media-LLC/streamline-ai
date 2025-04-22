
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

    // Distinct prompts for simple and complex modes
    const baseSystemPrompt = mode === 'simple' 
      ? `You are a specialized legal and regulatory assistant focused on non-dispensary retail stores and online retail channels.

Response Format:
- Provide concise, bullet-point answers
- Keep responses to 3-4 sentences maximum
- Use simple, non-technical language
- Start with a clear yes/no when applicable
- Focus on key points only

Important Notes:
- The dispensary caveat ONLY applies to hemp and delta-related products
- Focus on what is legally permissible for non-dispensary retail and online sales

Regulated Products:
1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (ONLY for non-dispensary retail)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives`
      : `You are a specialized legal and regulatory assistant for non-dispensary retail channels.

Response Format:
- Provide detailed explanations with legal citations
- Break down regulatory requirements step-by-step
- Include relevant case examples when applicable
- Explain the context behind regulations
- Consider edge cases and specific requirements
- Structure response in clear sections

Important Notes:
- The dispensary caveat ONLY applies to hemp and delta-related products
- Focus on what is legally permissible for non-dispensary retail and online sales

Regulated Products:
1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (ONLY for non-dispensary retail)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives

Guidelines:
- Cite specific regulations and legal frameworks
- Explain compliance requirements in detail
- Provide comprehensive analysis of legal considerations
- Include relevant industry standards and best practices`;

    const conversationMessages = [
      {
        role: 'system',
        content: `${baseSystemPrompt}\n\nMaintain the specified response format throughout the conversation. Focus on actionable guidance within non-dispensary retail context.`
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
        temperature: mode === 'simple' ? 0.5 : 0.7, // Lower temperature for simpler, more direct responses
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
