
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Full request body:', JSON.stringify(requestBody, null, 2));

    // Extract the user's message from the request
    let userMessage = '';
    
    if (requestBody.message) {
      // Direct message format
      userMessage = requestBody.message;
    } else if (requestBody.messages && Array.isArray(requestBody.messages)) {
      // Chat messages format - get the last user message
      const lastUserMessage = requestBody.messages
        .filter(msg => msg.role === 'user')
        .pop();
      userMessage = lastUserMessage?.content || '';
    }

    if (!userMessage) {
      console.error('No message found in request');
      return new Response(JSON.stringify({ 
        error: 'No message provided',
        details: 'Request must include either a message field or messages array with user messages'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Processing user message:', userMessage);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enhanced query analysis with better product legality detection
    const queryAnalysis = analyzeQuery(userMessage);
    console.log('Query analysis:', queryAnalysis);

    let selectedSources = [];
    let searchParams = {};

    // Determine data sources and search parameters
    if (queryAnalysis.isProductLegality) {
      selectedSources = ['state_map'];
      searchParams = {
        product: queryAnalysis.product,
        state: queryAnalysis.state,
        query: userMessage
      };
    } else {
      selectedSources = ['drive_files', 'knowledge_base'];
      searchParams = { query: userMessage };
    }

    console.log('Selected data sources:', selectedSources);
    console.log('Search params:', searchParams);

    let contextData = [];

    // Query each selected data source
    for (const source of selectedSources) {
      console.log(`Querying ${source}...`);
      
      try {
        let sourceData = [];
        
        if (source === 'state_map') {
          sourceData = await queryStateMap(supabase, searchParams);
        } else if (source === 'drive_files') {
          sourceData = await queryDriveFiles(supabase, searchParams);
        } else if (source === 'knowledge_base') {
          sourceData = await queryKnowledgeBase(supabase, searchParams);
        }
        
        console.log(`${source} returned ${sourceData.length} results`);
        
        if (sourceData.length > 0) {
          contextData.push(...sourceData.map(item => ({
            ...item,
            source: source
          })));
        }
      } catch (error) {
        console.error(`Error querying ${source}:`, error);
      }
    }

    console.log('Total context data items:', contextData.length);

    // Generate AI response
    const aiResponse = await generateAIResponse(openaiApiKey, userMessage, contextData, queryAnalysis);
    
    return new Response(JSON.stringify({ 
      response: aiResponse,
      sources: contextData.map(item => ({
        type: item.source,
        title: item.title || item.file_name || 'Document',
        content: item.content || item.summary || 'Content not available'
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in streamline-ai function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred processing your request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function analyzeQuery(query: string) {
  if (!query || typeof query !== 'string') {
    console.error('Invalid query provided to analyzeQuery:', query);
    return {
      isProductLegality: false,
      product: null,
      state: null
    };
  }

  const lowerQuery = query.toLowerCase();
  
  // Enhanced product legality detection patterns
  const legalityKeywords = ['legal', 'legality', 'allowed', 'permitted', 'banned', 'prohibited', 'can i', 'available'];
  const stateKeywords = ['state', 'texas', 'california', 'florida', 'new york', 'nevada', 'colorado', 'washington'];
  const productKeywords = ['product', 'juice', 'vape', 'pouch', 'gummy', 'edible', 'cart', 'disposable'];
  
  const hasLegalityKeyword = legalityKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasStateKeyword = stateKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasProductKeyword = productKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Extract state name
  let detectedState = null;
  const stateMatches = [
    { pattern: /texas/i, name: 'Texas' },
    { pattern: /california/i, name: 'California' },
    { pattern: /florida/i, name: 'Florida' },
    { pattern: /nevada/i, name: 'Nevada' },
    { pattern: /colorado/i, name: 'Colorado' },
    { pattern: /washington/i, name: 'Washington' },
    { pattern: /new york/i, name: 'New York' }
  ];
  
  for (const stateMatch of stateMatches) {
    if (stateMatch.pattern.test(lowerQuery)) {
      detectedState = stateMatch.name;
      break;
    }
  }
  
  // Extract product name - enhanced extraction
  let detectedProduct = null;
  const productMatches = [
    { pattern: /juice head pouches?/i, name: 'Juice Head Pouches' },
    { pattern: /juice head/i, name: 'Juice Head' },
    { pattern: /pouches?/i, name: 'Pouches' },
    { pattern: /gummies/i, name: 'Gummies' },
    { pattern: /vape/i, name: 'Vape' },
    { pattern: /cart/i, name: 'Cart' },
    { pattern: /disposable/i, name: 'Disposable' }
  ];
  
  for (const productMatch of productMatches) {
    if (productMatch.pattern.test(lowerQuery)) {
      detectedProduct = productMatch.name;
      break;
    }
  }
  
  const isProductLegality = (hasLegalityKeyword || hasStateKeyword) && (hasProductKeyword || detectedProduct);
  
  console.log('Query analysis result:', {
    isProductLegality,
    product: detectedProduct,
    state: detectedState,
    hasLegalityKeyword,
    hasStateKeyword,
    hasProductKeyword
  });
  
  return {
    isProductLegality,
    product: detectedProduct,
    state: detectedState
  };
}

async function queryStateMap(supabase: any, params: any) {
  try {
    console.log('Querying state map with params:', params);
    
    const { product, state } = params;
    
    if (!state) {
      console.log('No state detected, cannot query state map');
      return [];
    }
    
    // Step 1: Find the state
    console.log(`Searching for state: ${state}`);
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id, name')
      .ilike('name', `%${state}%`)
      .limit(1);
    
    if (stateError) {
      console.error('Error finding state:', stateError);
      return [];
    }
    
    if (!stateData || stateData.length === 0) {
      console.log('State not found:', state);
      return [];
    }
    
    const foundState = stateData[0];
    console.log(`Found state: ${foundState.name} with ID: ${foundState.id}`);
    
    // Step 2: Find matching products
    let productResults = [];
    
    if (product) {
      console.log(`Searching for product: ${product}`);
      
      // Try exact match first
      const { data: exactProducts, error: exactError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          brands (
            id,
            name
          )
        `)
        .ilike('name', `%${product}%`);
      
      if (exactError) {
        console.error('Error in exact product search:', exactError);
      } else if (exactProducts && exactProducts.length > 0) {
        productResults = exactProducts;
        console.log(`Found ${productResults.length} products with exact match`);
      }
      
      // If no exact match and product contains multiple words, try brand search
      if (productResults.length === 0 && product.includes(' ')) {
        const brandName = product.split(' ')[0]; // Get first word as potential brand
        console.log(`Searching for brand: ${brandName}`);
        
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('id, name')
          .ilike('name', `%${brandName}%`)
          .limit(1);
        
        if (!brandError && brandData && brandData.length > 0) {
          console.log(`Found exact brand match: ${brandData[0].name}`);
          
          const { data: brandProducts, error: brandProductsError } = await supabase
            .from('products')
            .select(`
              id,
              name,
              brands (
                id,
                name
              )
            `)
            .eq('brand_id', brandData[0].id);
          
          if (!brandProductsError && brandProducts) {
            productResults = brandProducts;
            console.log(`Found ${productResults.length} products for brand`);
          }
        }
      }
    }
    
    // Step 3: Check product legality in the state
    if (productResults.length > 0) {
      console.log(`Applying product filter for: ${product}`);
      
      for (const productItem of productResults) {
        console.log(`Checking legality for product ID ${productItem.id} in state ID ${foundState.id}`);
        
        const { data: legalityData, error: legalityError } = await supabase
          .from('state_allowed_products')
          .select('*')
          .eq('state_id', foundState.id)
          .eq('product_id', productItem.id);
        
        if (legalityError) {
          console.error('Error checking legality:', legalityError);
          continue;
        }
        
        const isLegal = legalityData && legalityData.length > 0;
        console.log(`Product ${productItem.name} is ${isLegal ? 'LEGAL' : 'NOT LEGAL'} in ${foundState.name}`);
        
        return [{
          title: `${productItem.name} Legality in ${foundState.name}`,
          content: `${productItem.name} is ${isLegal ? 'legal' : 'not legal'} in ${foundState.name}.`,
          state: foundState.name,
          product: productItem.name,
          brand: productItem.brands?.name,
          isLegal,
          source: 'state_map'
        }];
      }
    } else {
      console.log('No products found, returning general state info');
      return [{
        title: `Product Information for ${foundState.name}`,
        content: `No specific product information found for "${product}" in ${foundState.name}. Please check the product name or contact compliance for verification.`,
        state: foundState.name,
        product: product,
        isLegal: null,
        source: 'state_map'
      }];
    }
    
    return [];
    
  } catch (error) {
    console.error('Error in queryStateMap:', error);
    return [];
  }
}

async function queryDriveFiles(supabase: any, params: any) {
  try {
    const { query } = params;
    console.log('Querying drive files with query:', query);
    
    const keywords = extractKeywords(query);
    console.log('Trying keyword search with:', keywords);
    
    if (keywords.length === 0) {
      return [];
    }
    
    // Build OR conditions for file names
    const fileNameConditions = keywords.map(keyword => `file_name.ilike.%${keyword}%`);
    const orCondition = fileNameConditions.join(',');
    
    console.log('Using OR condition:', orCondition);
    
    // Search in file names and content
    const { data: files, error } = await supabase
      .from('drive_files')
      .select(`
        id,
        file_name,
        category,
        brand,
        subcategory_1,
        subcategory_2,
        file_content (
          content
        )
      `)
      .or(orCondition)
      .limit(10);
    
    if (error) {
      console.error('Drive files query error:', error);
      return [];
    }
    
    console.log(`Drive files query returned ${files?.length || 0} results`);
    
    return (files || []).map(file => ({
      title: file.file_name,
      content: file.file_content?.[0]?.content || `File: ${file.file_name}`,
      category: file.category,
      brand: file.brand,
      file_name: file.file_name
    }));
    
  } catch (error) {
    console.error('Error in queryDriveFiles:', error);
    return [];
  }
}

async function queryKnowledgeBase(supabase: any, params: any) {
  try {
    const { query } = params;
    console.log('Querying knowledge base with query:', query);
    
    const keywords = extractKeywords(query);
    console.log('Knowledge base keywords:', keywords);
    
    if (keywords.length === 0) {
      return [];
    }
    
    // Build OR conditions for content
    const contentConditions = keywords.map(keyword => `content.ilike.%${keyword}%`);
    const orCondition = contentConditions.join(',');
    
    const { data: entries, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('is_active', true)
      .or(orCondition)
      .limit(5);
    
    if (error) {
      console.error('Knowledge base query error:', error);
      return [];
    }
    
    console.log(`Knowledge base query returned ${entries?.length || 0} results`);
    
    return (entries || []).map(entry => ({
      title: entry.title,
      content: entry.content,
      tags: entry.tags
    }));
    
  } catch (error) {
    console.error('Error in queryKnowledgeBase:', error);
    return [];
  }
}

function extractKeywords(query: string): string[] {
  const stopWords = new Set(['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']);
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 5);
}

async function generateAIResponse(openaiApiKey: string, query: string, contextData: any[], queryAnalysis: any) {
  try {
    console.log('Generating AI response with', contextData.length, 'context items');
    
    let systemPrompt = `You are a helpful AI assistant for Streamline Brands. You provide accurate information based on the company's data sources.

Response Format Requirements:
1. Direct Answer: Provide a clear, direct answer to the user's question
2. Source Attribution: Explain what sources were used to find this information
3. Relevant Details: Include any important details from the sources
4. Next Steps: If applicable, suggest what the user should do next

Always be helpful, accurate, and cite your sources appropriately.`;

    if (queryAnalysis.isProductLegality) {
      systemPrompt += `

For product legality questions:
- Give a clear YES/NO answer about legality
- Cite the specific product and state
- If no data is found, clearly state this and suggest contacting compliance
- Be precise about what products are covered`;
    }

    const contextText = contextData.length > 0 
      ? contextData.map(item => {
          if (item.source === 'state_map') {
            return `Product Legality Data: ${item.content}`;
          }
          return `${item.title}: ${item.content}`;
        }).join('\n\n')
      : 'No specific information found in the database.';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `User Question: ${query}\n\nAvailable Information:\n${contextText}` }
        ],
        temperature: 0.3,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.';
  }
}
