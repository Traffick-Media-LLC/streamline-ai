
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

  try {
    const { messages, chatId, userId } = await req.json();
    console.log('Full request body:', JSON.stringify({ messages, chatId, userId }));

    const currentMessage = messages[messages.length - 1]?.content || '';
    console.log('Processing user message:', currentMessage);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Analyze conversation context for better filtering
    const conversationHistory = messages.slice(0, -1);
    console.log('Conversation history length:', conversationHistory.length);

    const inheritedContext = analyzeConversationContext(conversationHistory);
    console.log('Inherited context from conversation:', inheritedContext);

    // Enhanced contextual analysis with product category awareness
    const queryAnalysis = analyzeQuery(currentMessage, inheritedContext);
    console.log('Enhanced contextual query analysis:', queryAnalysis);

    // Determine source strategy with improved relevance filtering
    const sourceStrategy = determineSourceStrategy(queryAnalysis);
    console.log('Enhanced source strategy:', sourceStrategy);

    let contextData: any[] = [];

    if (sourceStrategy.shouldProvideDirectAnswer) {
      console.log('Providing direct answer from internal sources');
      
      // Query internal sources with improved filtering
      for (const source of sourceStrategy.internalSources) {
        console.log(`Querying internal source ${source.name}...`);
        
        if (source.name === 'knowledge_base') {
          const knowledgeData = await queryKnowledgeBaseEnhanced(supabase, currentMessage, queryAnalysis);
          if (knowledgeData) contextData.push(knowledgeData);
        } else if (source.name === 'state_map') {
          const stateData = await queryStateProducts(supabase, queryAnalysis);
          if (stateData) contextData.push(stateData);
        } else if (source.name === 'state_excise_taxes') {
          const taxData = await queryExciseTaxes(supabase, queryAnalysis.state);
          if (taxData) contextData.push(taxData);
        }
      }

      console.log('Total context data items:', contextData.length);
      
      // Generate enhanced AI response with source validation
      const aiResponse = await generateEnhancedAIResponse(currentMessage, contextData, queryAnalysis);
      
      // Comprehensive format cleanup
      const cleanedResponse = cleanupResponse(aiResponse);
      
      return new Response(JSON.stringify({ 
        response: cleanedResponse,
        sources: extractSources(contextData)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback response for non-matching queries
    return new Response(JSON.stringify({ 
      response: "I don't have specific information about that topic in our database. Please contact our compliance team for detailed assistance.",
      sources: []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in streamline-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function analyzeConversationContext(messages: any[]) {
  // Extract context from previous messages to maintain consistency
  let context: any = {
    state: null,
    brand: null,
    product: null,
    wasLegalQuery: false,
    wasListQuery: false
  };

  for (const message of messages) {
    if (message.role === 'user') {
      const content = message.content.toLowerCase();
      
      // Extract state mentions
      const stateMatches = content.match(/\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i);
      if (stateMatches) context.state = stateMatches[0];
      
      // Extract product/brand mentions
      const productMatches = content.match(/\b(delta-?8|delta-?9|cbd|thc|nicotine|vape|juice|head|streamline)\b/i);
      if (productMatches) context.brand = productMatches[0].replace('-', '');
      
      // Identify query types
      if (content.includes('legal') || content.includes('allow')) context.wasLegalQuery = true;
      if (content.includes('list') || content.includes('what products')) context.wasListQuery = true;
    }
  }

  return context;
}

function analyzeQuery(query: string, inheritedContext: any) {
  const lowercaseQuery = query.toLowerCase();
  
  // Enhanced product category detection
  const productCategories = {
    cannabis: ['delta-8', 'delta-9', 'thc', 'cbd', 'cannabis', 'hemp'],
    nicotine: ['nicotine', 'vape', 'tobacco', 'cigarette', 'e-cig'],
    general: ['juice', 'head', 'streamline']
  };

  let detectedCategory = null;
  for (const [category, keywords] of Object.entries(productCategories)) {
    if (keywords.some(keyword => lowercaseQuery.includes(keyword))) {
      detectedCategory = category;
      break;
    }
  }

  return {
    isProductLegality: lowercaseQuery.includes('legal') || lowercaseQuery.includes('allow') || inheritedContext.brand,
    isFileSearch: lowercaseQuery.includes('file') || lowercaseQuery.includes('document') || lowercaseQuery.includes('brochure'),
    requiresLegalAnalysis: lowercaseQuery.includes('legal') || lowercaseQuery.includes('regulation') || lowercaseQuery.includes('compliance'),
    requiresOfficialCrawling: false,
    isWhyBannedQuestion: lowercaseQuery.includes('why') && (lowercaseQuery.includes('banned') || lowercaseQuery.includes('illegal')),
    isBillTextRequest: lowercaseQuery.includes('bill text') || lowercaseQuery.includes('legislation'),
    isEnforcementRequest: lowercaseQuery.includes('enforce') || lowercaseQuery.includes('penalty'),
    product: inheritedContext.product,
    brand: inheritedContext.brand || extractBrandFromQuery(lowercaseQuery),
    state: inheritedContext.state || extractStateFromQuery(lowercaseQuery),
    isListQuery: lowercaseQuery.includes('list') || lowercaseQuery.includes('what products'),
    fileType: extractFileType(lowercaseQuery),
    category: detectedCategory,
    tags: extractRelevantTags(lowercaseQuery, inheritedContext),
    legalComplexity: determineLegalComplexity(lowercaseQuery),
    intentType: determineIntentType(lowercaseQuery),
    confidenceLevel: 'medium',
    inheritedContext
  };
}

function extractBrandFromQuery(query: string): string | null {
  const brandPatterns = [
    /\b(delta-?8|delta-?9)\b/i,
    /\b(juice\s+head|juicehead)\b/i,
    /\bstreamline\b/i,
    /\bcbd\b/i,
    /\bthc\b/i
  ];

  for (const pattern of brandPatterns) {
    const match = query.match(pattern);
    if (match) return match[0].toLowerCase().replace('-', '');
  }
  return null;
}

function extractStateFromQuery(query: string): string | null {
  const statePattern = /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i;
  const match = query.match(statePattern);
  return match ? match[0] : null;
}

function extractFileType(query: string): string | null {
  const fileTypes = ['pdf', 'brochure', 'document', 'file', 'report'];
  for (const type of fileTypes) {
    if (query.includes(type)) return type;
  }
  return null;
}

function extractRelevantTags(query: string, context: any): string[] {
  const tags = [];
  
  // Add context-based tags
  if (context.brand) tags.push(context.brand);
  if (context.state) tags.push(context.state.toLowerCase());
  if (context.product) tags.push(context.product);
  
  // Add query-based tags
  const queryWords = query.toLowerCase().split(/\s+/);
  const relevantWords = queryWords.filter(word => 
    word.length > 2 && 
    !['the', 'and', 'for', 'are', 'can', 'our', 'you', 'what', 'how', 'where', 'when', 'why'].includes(word)
  );
  
  tags.push(...relevantWords.slice(0, 5)); // Limit to 5 most relevant words
  
  return [...new Set(tags)]; // Remove duplicates
}

function determineLegalComplexity(query: string): string {
  if (query.includes('regulation') || query.includes('compliance') || query.includes('enforcement')) {
    return 'complex';
  } else if (query.includes('legal') || query.includes('allow')) {
    return 'moderate';
  }
  return 'basic';
}

function determineIntentType(query: string): string {
  if (query.includes('legal') || query.includes('allow') || query.includes('regulation')) {
    return 'legal_inquiry';
  } else if (query.includes('file') || query.includes('document') || query.includes('brochure')) {
    return 'document_search';
  } else if (query.includes('list') || query.includes('what products')) {
    return 'product_listing';
  }
  return 'general_inquiry';
}

function determineSourceStrategy(analysis: any) {
  const strategy = {
    internalSources: [] as any[],
    shouldProvideDirectAnswer: true,
    shouldCrawlOfficialSources: false,
    strategy: 'direct_internal_answer'
  };

  // Prioritize sources based on query type and product category
  if (analysis.isProductLegality || analysis.requiresLegalAnalysis) {
    strategy.internalSources.push({ name: 'state_map', priority: 10 });
    strategy.internalSources.push({ name: 'state_excise_taxes', priority: 8 });
  }
  
  // Only include knowledge base if it's relevant to the detected category
  if (analysis.category) {
    strategy.internalSources.push({ name: 'knowledge_base', priority: 6 });
  }

  return strategy;
}

async function queryKnowledgeBaseEnhanced(supabase: any, query: string, analysis: any) {
  // Enhanced knowledge base query with category filtering
  const keywords = query.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !['the', 'and', 'for', 'are', 'can', 'our', 'you'].includes(word))
    .slice(0, 8);

  console.log('Knowledge base keywords:', keywords);

  const enhancedParams = {
    query: query,
    tags: analysis.tags,
    category: analysis.category // Add category filter
  };

  console.log('Enhanced knowledge base query with params:', enhancedParams);

  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('is_active', true)
      .or(
        keywords.map(keyword => `content.ilike.%${keyword}%`).join(',') + ',' +
        keywords.map(keyword => `title.ilike.%${keyword}%`).join(',')
      )
      .limit(5);

    if (error) {
      console.error('Knowledge base query error:', error);
      return null;
    }

    // Filter results by category relevance
    const filteredData = data?.filter(entry => {
      if (!analysis.category) return true;
      
      const content = (entry.content + ' ' + entry.title).toLowerCase();
      
      // Category-specific filtering
      if (analysis.category === 'cannabis') {
        return content.includes('delta') || content.includes('thc') || content.includes('cbd') || content.includes('cannabis') || content.includes('hemp');
      } else if (analysis.category === 'nicotine') {
        return content.includes('nicotine') || content.includes('tobacco') || content.includes('vape');
      }
      
      return true;
    }) || [];

    console.log('Enhanced knowledge base query returned', filteredData.length, 'results');

    if (filteredData.length === 0) return null;

    return {
      source: 'Internal Knowledge Base',
      type: 'knowledge_base',
      data: filteredData.map(entry => `${entry.title}: ${entry.content}`).join('\n\n'),
      found: true,
      relevance: 'high'
    };
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    return null;
  }
}

async function queryStateProducts(supabase: any, analysis: any) {
  console.log('Querying internal source state_map...');
  
  if (!analysis.state) return null;

  try {
    console.log('Searching for state:', analysis.state);
    
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id, name')
      .ilike('name', `%${analysis.state}%`)
      .single();

    if (stateError || !stateData) {
      console.error('State not found:', analysis.state);
      return null;
    }

    console.log('Found state:', stateData.name, 'with ID:', stateData.id);

    // Query for products with category filtering
    let productsQuery = supabase
      .from('state_allowed_products')
      .select(`
        product_id,
        products!inner(id, name, brand:brands(id, name))
      `)
      .eq('state_id', stateData.id);

    // Apply brand/product filtering if specified
    if (analysis.brand) {
      console.log('Searching for brand only:', analysis.brand);
      productsQuery = productsQuery.or(`products.brands.name.ilike.%${analysis.brand}%,products.name.ilike.%${analysis.brand}%`);
    }

    const { data: productData, error: productError } = await productsQuery;

    if (productError) {
      console.error('Error querying products:', productError);
    }

    if (!productData || productData.length === 0) {
      console.log('No products found, returning general state info');
      return {
        source: 'Product Legality Data (Internal Database)',
        type: 'state_products',
        data: `No specific product information found for "${analysis.brand || 'specified products'}" in ${stateData.name}. Please check the product name or contact compliance for verification.`,
        found: false,
        state: stateData.name,
        relevance: 'medium'
      };
    }

    const productList = productData.map(item => 
      `${item.products.brand?.name || 'Unknown Brand'} - ${item.products.name}`
    ).join('\n- ');

    return {
      source: 'Product Legality Data (Internal Database)',
      type: 'state_products',
      data: `Allowed products in ${stateData.name}:\n- ${productList}`,
      found: true,
      state: stateData.name,
      relevance: 'high'
    };
  } catch (error) {
    console.error('Error in queryStateProducts:', error);
    return null;
  }
}

async function queryExciseTaxes(supabase: any, state: string | null) {
  if (!state) return null;
  
  console.log('Querying excise taxes for state:', state);
  
  try {
    const { data: stateData } = await supabase
      .from('states')
      .select('id')
      .ilike('name', `%${state}%`)
      .single();

    if (!stateData) return null;

    const { data: taxData } = await supabase
      .from('state_excise_taxes')
      .select('excise_tax_info')
      .eq('state_id', stateData.id)
      .single();

    if (!taxData?.excise_tax_info) {
      return {
        source: 'State Excise Tax Information (Internal Database)',
        type: 'excise_taxes',
        data: `No excise tax information is currently available for ${state}. Please contact compliance for the latest tax requirements.`,
        found: false,
        relevance: 'low'
      };
    }

    return {
      source: 'State Excise Tax Information (Internal Database)',
      type: 'excise_taxes',
      data: taxData.excise_tax_info,
      found: true,
      relevance: 'high'
    };
  } catch (error) {
    console.error('Error querying excise taxes:', error);
    return null;
  }
}

async function generateEnhancedAIResponse(message: string, contextData: any[], analysis: any) {
  console.log('Generating enhanced AI response with', contextData.length, 'context items');
  console.log('Query analysis for AI:', analysis);

  const openAIApiKey = Deno.env.get('XAI_API_KEY') || Deno.env.get('OPENAI_API_KEY');
  
  // Build enhanced context with source attribution
  const enhancedContext = contextData.map(item => {
    return `**${item.source}:**\n${item.data}`;
  }).join('\n\n');

  console.log('Enhanced context sent to AI:', enhancedContext.substring(0, 500) + '...');

  // Enhanced system prompt with strict source citation requirements
  const systemPrompt = `You are a compliance assistant for the Streamline Group, specializing in product legality and regulatory information.

CRITICAL REQUIREMENTS:
1. **MANDATORY SOURCE CITATION**: You MUST cite the specific source for every piece of information you provide. Use the exact source names provided in the context.

2. **PRODUCT CATEGORY CONSISTENCY**: Stay strictly within the product category being discussed. Do NOT mix different product categories (e.g., if asked about cannabis/Delta-8, do NOT discuss nicotine products or tobacco regulations).

3. **ACCURACY FIRST**: Only provide information that is explicitly supported by the provided context. If information is missing or unclear, clearly state this limitation.

4. **CLEAR SOURCE ATTRIBUTION**: Format your response with clear sections showing:
   - **Source**: [Exact source name from context]
   - **Information**: [Specific details from that source]

5. **CONTEXT VALIDATION**: Before including any information, verify it's relevant to the specific product/topic being discussed.

RESPONSE FORMAT:
- Start with a clear, direct answer
- Provide supporting details with explicit source citations
- Use bullet points for clarity
- End with next steps or recommendations if appropriate
- If sources cite government websites or official documents, include those references

DO NOT:
- Mix information from different product categories
- Provide information without proper source attribution
- Include irrelevant regulatory content
- Make assumptions beyond what's explicitly stated in the sources

Current query context: ${analysis.category ? `Product Category: ${analysis.category}` : 'General inquiry'}
${analysis.state ? `State: ${analysis.state}` : ''}
${analysis.brand ? `Brand/Product: ${analysis.brand}` : ''}`;

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${message}\n\nAvailable Information:\n${enhancedContext}` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling AI API:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again or contact our compliance team for assistance.';
  }
}

function extractSources(contextData: any[]): string[] {
  return contextData.map(item => item.source).filter(Boolean);
}

function cleanupResponse(response: string): string {
  console.log('Starting comprehensive format cleanup...');
  console.log('AI response before cleanup (first 500 chars):', response.substring(0, 500));
  
  let cleaned = response;
  
  // Remove excessive whitespace and normalize formatting
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n[ \t]+/g, '\n');
  
  // Fix markdown formatting issues
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*:/g, '**$1**:');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*\n-/g, '**$1**\n-');
  
  // Ensure proper spacing around sections
  cleaned = cleaned.replace(/(\*\*[^*]+\*\*)\n([^-\n])/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([^:\n])\n(\*\*[^*]+\*\*)/g, '$1\n\n$2');
  
  // Clean up bullet point formatting
  cleaned = cleaned.replace(/^[\s]*-[\s]*/gm, '- ');
  cleaned = cleaned.replace(/\n[\s]*-/g, '\n- ');
  
  // Remove trailing whitespace
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  cleaned = cleaned.trim();
  
  console.log('Comprehensive format cleanup completed');
  console.log('AI response after cleanup (first 500 chars):', cleaned.substring(0, 500));
  
  return cleaned;
}
