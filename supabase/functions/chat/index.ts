
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

    const { data: relevantEntries, error: searchError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at')
      .filter('is_active', 'eq', true)
      .textSearch('content', content.split(' ').join(' | '));

    if (searchError) {
      console.error('Error searching knowledge base:', searchError);
    }

    const knowledgeBaseContext = relevantEntries?.length
      ? "\n\nVerified information from our knowledge base:\n" + 
        relevantEntries.map(entry => 
          `${entry.title} (Last Updated: ${new Date(entry.updated_at).toLocaleDateString()}):\n${entry.content}`
        ).join('\n\n')
      : '';

    const baseSystemPrompt = mode === 'simple' 
      ? `You are a specialized legal and regulatory assistant focused on non-dispensary retail stores and online retail channels ONLY. You provide guidance on the following regulated products:

1. Nicotine Products:
   - E-liquids
   - Disposable vapes
   - Nicotine pouches

2. Hemp-derived THC Products
   - Focus on what's legal for non-dispensary retail

3. Kratom Products:
   - Raw materials
   - Processed products

4. 7-Hydroxy Products and Derivatives

For ALL products, you MUST:
- Only discuss what is legal for non-dispensary retail and online sales
- Emphasize current regulations and restrictions
- Use plain English and focus on immediate practical implications
- If unsure about current legality, explicitly state that and suggest where to find updates
- Never provide advice about products that require dispensary distribution`
      : `You are a specialized legal and regulatory assistant for non-dispensary retail stores and online retail channels, focusing on:

1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (non-dispensary retail only)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives

Your responses in complex mode MUST:
1. Include inline citations using markdown links, e.g., [FDA Guidance](https://example.com)
2. Provide comprehensive analysis of current laws and regulations
3. Format section titles in bold using ** ** syntax
4. End with a "References" section listing all cited sources
5. Specifically address retail and online sales channel requirements
6. Never provide advice about products requiring dispensary distribution

Example Format:
**Regulatory Overview**
According to the [FDA's Current Guidance](https://example.com), nicotine products must...

**Compliance Requirements**
The [State Board of Pharmacy](https://example.com) mandates that...

References:
- [FDA - Nicotine Product Guidelines](https://example.com)
- [State Regulations - Hemp Products](https://example.com)`;

    const conversationMessages = [
      {
        role: 'system',
        content: `${baseSystemPrompt}${knowledgeBaseContext}\n\nMaintain context from the entire conversation. Remember we ONLY operate through non-dispensary retail stores and online retail, therefore any product that requires dispensary distribution is effectively NOT legal for our purposes. Always verify current regulations and emphasize the specific context of our sales channels. If information seems outdated, explicitly state that and suggest where to find current updates.`
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
