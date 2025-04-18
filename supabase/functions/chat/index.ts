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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Search for relevant knowledge entries based on the user's message
    const { data: relevantEntries, error: searchError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at')
      .filter('is_active', 'eq', true)
      .textSearch('content', content.split(' ').join(' | '));

    if (searchError) {
      console.error('Error searching knowledge base:', searchError);
    }

    // Format knowledge base entries for the prompt
    const knowledgeBaseContext = relevantEntries?.length
      ? "\n\nVerified information from our knowledge base:\n" + 
        relevantEntries.map(entry => 
          `${entry.title} (Last Updated: ${new Date(entry.updated_at).toLocaleDateString()}):\n${entry.content}`
        ).join('\n\n')
      : '';

    // Base system prompt that establishes the AI's role and behavior
    const baseSystemPrompt = mode === 'simple' 
      ? 'You are a legal assistant providing clear, direct answers about regulated industries. Use plain English and focus on current legality status and immediate sales restrictions. Always cite the most recent regulatory updates when available.'
      : 'You are a legal assistant providing comprehensive analysis about regulated industries. Include specific references to current laws, recent regulatory decisions, and relevant legal documents. Emphasize the most up-to-date information available and note any pending changes or updates to regulations.';

    // Create the messages array with the system prompt and conversation history
    const conversationMessages = [
      {
        role: 'system',
        content: `${baseSystemPrompt}${knowledgeBaseContext}\n\nMaintain context from the entire conversation when answering follow-up questions. Always prioritize the most recent and authoritative sources. If information seems outdated, explicitly state that and suggest where to find current updates.`
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
