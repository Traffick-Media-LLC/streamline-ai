
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
      ? 'You are a legal assistant specifically focused on product legality for a sales organization that sells regulated products through non-dispensary retail stores and online retail channels ONLY. When discussing legality, you must ONLY consider what is legal for these specific sales channels - not what is legal in general or through dispensaries. Use plain English and focus on current legality status and immediate sales restrictions that apply specifically to non-dispensary retail and online sales channels.'
      : `You are a legal assistant specifically focused on product legality for a sales organization that sells regulated products through non-dispensary retail stores and online retail channels ONLY. When discussing legality, you must ONLY consider what is legal for these specific sales channels - not what is legal in general or through dispensaries. 

Your responses in complex mode should:
1. Include inline citations when referencing sources using markdown links, e.g., "According to [Department Guidelines](https://example.com), product X is regulated..."
2. Provide comprehensive analysis with specific references to current laws and regulations
3. Format section titles in bold using ** ** syntax
4. End with a "References" section listing all sources cited in your response, each as a clickable link with descriptive text
5. For example, if discussing state regulations, cite the specific state agency or legislative document where the information comes from

Format example:
**Regulatory Overview**
According to the [State Department of Agriculture](https://example.com), hemp products must...

**Testing Requirements**
The [Laboratory Standards Board](https://example.com) mandates that...

References:
- [State Department of Agriculture - Hemp Program Guidelines](https://example.com)
- [Laboratory Standards Board - Testing Requirements](https://example.com)`;

    const conversationMessages = [
      {
        role: 'system',
        content: `${baseSystemPrompt}${knowledgeBaseContext}\n\nMaintain context from the entire conversation and remember we ONLY operate through non-dispensary retail stores and online retail. Therefore, any product that requires dispensary distribution is effectively NOT legal for our purposes. Always consider the specific context of our sales channels when discussing legality. If information seems outdated, explicitly state that and suggest where to find current updates.`
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
        temperature: 0.7,  // Adjusted for more consistent formatting while maintaining creativity
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
