
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

    // Extract potential brand and product names from the query
    const words = content.split(' ');
    const potentialBrands = words
      .filter((word: string) => word.length > 2)
      .map((word: string) => word.replace(/[^\w]/g, ''));
    
    // First search: Look for exact brand matches
    let { data: brandEntries, error: brandError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"brand"}')
      .or(potentialBrands.map(brand => `title.ilike.%${brand}%`).join(','));
    
    if (brandError) {
      console.error('Error searching for brands:', brandError);
      brandEntries = [];
    }

    // Second search: Look for product matches
    let { data: productEntries, error: productError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"product"}')
      .or(potentialBrands.map(term => `title.ilike.%${term}%`).join(','));
    
    if (productError) {
      console.error('Error searching for products:', productError);
      productEntries = [];
    }

    // Third search: General content search for regulatory info
    let { data: regulatoryEntries, error: regulatoryError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .textSearch('content', content.split(' ').join(' | '));
    
    if (regulatoryError) {
      console.error('Error searching regulatory content:', regulatoryError);
      regulatoryEntries = [];
    }

    // Combine results, with brand/product matches first
    const allEntries = [
      ...(brandEntries || []), 
      ...(productEntries || []),
      ...(regulatoryEntries || []).filter(entry => 
        !brandEntries?.some(b => b.id === entry.id) && 
        !productEntries?.some(p => p.id === entry.id)
      )
    ];

    console.log(`Found ${brandEntries?.length || 0} brand entries, ${productEntries?.length || 0} product entries, and ${regulatoryEntries?.length || 0} regulatory entries`);
    
    // Generate knowledge context
    let knowledgeContext = "";
    if (allEntries.length > 0) {
      knowledgeContext = "Brand and Product Knowledge:\n\n";
      
      // Process brand entries first
      const brandInfo = brandEntries?.map(entry => 
        `Brand: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ).join('\n\n');
      
      if (brandInfo) {
        knowledgeContext += `${brandInfo}\n\n`;
      }

      // Process product entries next
      const productInfo = productEntries?.map(entry => 
        `Product: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ).join('\n\n');
      
      if (productInfo) {
        knowledgeContext += `${productInfo}\n\n`;
      }

      // Process other regulatory entries
      const regulatoryInfo = regulatoryEntries
        ?.filter(entry => 
          !brandEntries?.some(b => b.id === entry.id) && 
          !productEntries?.some(p => p.id === entry.id)
        )
        .map(entry => 
          `Regulatory: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
        ).join('\n\n');
      
      if (regulatoryInfo) {
        knowledgeContext += `${regulatoryInfo}\n\n`;
      }
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
4. 7-Hydroxy Products and Derivatives

Brand and Product Guidance:
- When a specific brand or product is mentioned, prioritize that information
- Address regulatory requirements specific to that brand or product's ingredients
- Be explicit about which states allow sales of specific brands/products
- When regulatory status varies by ingredient within a product, clarify this distinction`
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

Brand and Product Guidance:
- When a user inquires about a specific brand or product, prioritize information related to that brand/product
- Detail product-specific regulatory considerations based on the ingredients in that specific brand/product
- For products with multiple regulated ingredients, break down regulatory status by ingredient
- Include state-by-state analysis for specific brands or products when relevant
- Explicitly mention when certain products within a brand may have different regulatory status
- Cite the most up-to-date regulatory frameworks that apply to specific brand products`;

    // Build the final system message with the knowledge context
    let systemContent = baseSystemPrompt;
    if (knowledgeContext) {
      systemContent += `\n\n${knowledgeContext}`;
    }
    
    systemContent += `\n\nMaintain the specified response format throughout the conversation. Focus on actionable guidance within non-dispensary retail context.`;

    const conversationMessages = [
      { role: 'system', content: systemContent },
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
