
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

    // Format knowledge base entries with timestamps
    const knowledgeBaseContext = relevantEntries?.length
      ? "\n\nVerified information from our knowledge base:\n" + 
        relevantEntries.map(entry => {
          const lastUpdated = new Date(entry.updated_at);
          const daysSinceUpdate = Math.floor((Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
          const tags = entry.tags?.join(', ') || '';
          
          return `[KB Entry - Last verified: ${lastUpdated.toLocaleDateString()} (${daysSinceUpdate} days ago)]
Title: ${entry.title}
Tags: ${tags}
Content: ${entry.content}`;
        }).join('\n\n')
      : '';

    // Enhanced system prompt for credibility verification
    const baseSystemPrompt = mode === 'simple' 
      ? `You are a specialized legal and regulatory assistant focused on non-dispensary retail stores and online retail channels ONLY. You provide guidance on regulated products while adhering to these strict verification rules:

1. Always cross-reference knowledge base entries with current regulations
2. Explicitly state when information needs verification
3. Include confidence levels in your responses:
   - "Fully Verified" - When knowledge base matches current regulations
   - "Partially Verified" - When some aspects need updating
   - "Update Required" - When significant discrepancies exist

Focus on these regulated products:
1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (non-dispensary retail only)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives

For ALL responses:
- Prioritize knowledge base information but flag any potential outdated content
- Only discuss what is legal for non-dispensary retail and online sales
- Emphasize current regulations and restrictions
- If unsure about current legality, explicitly state that and suggest official sources
- Never provide advice about products requiring dispensary distribution`
      : `You are a specialized legal and regulatory assistant for non-dispensary retail channels, providing detailed responses with:

1. Confidence Level Assessment:
   - "Fully Verified" - Knowledge base matches current regulations
   - "Partially Verified" - Some aspects need updating
   - "Update Required" - Significant discrepancies exist

2. Source Attribution:
   - [Knowledge Base] - For verified internal data
   - [Current Regulation] - For latest regulatory updates
   - [Industry Standard] - For established practices

3. Response Structure:
   - Start with confidence level
   - List all sources used
   - Provide detailed analysis
   - Flag any discrepancies
   - End with verification timestamp

Focus on these regulated products ONLY:
1. Nicotine Products (e-liquids, disposable vapes, nicotine pouches)
2. Hemp-derived THC Products (non-dispensary retail only)
3. Kratom Products (raw materials and processed products)
4. 7-Hydroxy Products and Derivatives

Include inline citations using markdown links when available.`;

    const conversationMessages = [
      {
        role: 'system',
        content: `${baseSystemPrompt}${knowledgeBaseContext}\n\nMaintain context from the entire conversation. Remember we ONLY operate through non-dispensary retail stores and online retail, therefore any product that requires dispensary distribution is effectively NOT legal for our purposes. Always verify current regulations and emphasize the specific context of our sales channels. Flag any information that might be outdated and suggest official sources for updates.`
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
