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

    // Enhanced query analysis with dynamic brand detection
    const queryAnalysis = await analyzeQuery(userMessage, supabase);
    console.log('Query analysis:', queryAnalysis);

    let selectedSources = [];
    let searchParams = {};

    // Determine data sources and search parameters
    if (queryAnalysis.isProductLegality) {
      selectedSources = ['state_map'];
      searchParams = {
        product: queryAnalysis.product,
        brand: queryAnalysis.brand,
        state: queryAnalysis.state,
        query: userMessage,
        isListQuery: queryAnalysis.isListQuery
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

async function analyzeQuery(query: string, supabase: any) {
  if (!query || typeof query !== 'string') {
    console.error('Invalid query provided to analyzeQuery:', query);
    return {
      isProductLegality: false,
      product: null,
      brand: null,
      state: null,
      isListQuery: false
    };
  }

  const lowerQuery = query.toLowerCase();
  
  // Enhanced legality detection patterns
  const legalityKeywords = ['legal', 'legality', 'allowed', 'permitted', 'banned', 'prohibited', 'can i', 'available'];
  const hasLegalityKeyword = legalityKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Detect if this is a "list all products" query
  const listKeywords = ['which', 'what', 'list', 'all', 'what are', 'show me'];
  const isListQuery = listKeywords.some(keyword => lowerQuery.includes(keyword));
  console.log('Is list query:', isListQuery);
  
  // Dynamically fetch all states from database
  let detectedState = null;
  try {
    const { data: states, error } = await supabase
      .from('states')
      .select('name');
    
    if (!error && states) {
      // Check for state matches (case insensitive)
      for (const state of states) {
        const statePattern = new RegExp(`\\b${state.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (statePattern.test(lowerQuery)) {
          detectedState = state.name;
          console.log(`Detected state: ${detectedState}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching states:', error);
  }
  
  // If no state found in database, fallback to hardcoded patterns for common variations
  if (!detectedState) {
    const stateMatches = [
      { pattern: /texas/i, name: 'Texas' },
      { pattern: /california/i, name: 'California' },
      { pattern: /florida/i, name: 'Florida' },
      { pattern: /nevada/i, name: 'Nevada' },
      { pattern: /colorado/i, name: 'Colorado' },
      { pattern: /washington/i, name: 'Washington' },
      { pattern: /new york/i, name: 'New York' },
      { pattern: /kentucky/i, name: 'Kentucky' },
      { pattern: /alabama/i, name: 'Alabama' },
      { pattern: /georgia/i, name: 'Georgia' },
      { pattern: /tennessee/i, name: 'Tennessee' },
      { pattern: /north carolina/i, name: 'North Carolina' },
      { pattern: /south carolina/i, name: 'South Carolina' },
      { pattern: /virginia/i, name: 'Virginia' },
      { pattern: /west virginia/i, name: 'West Virginia' },
      { pattern: /maryland/i, name: 'Maryland' },
      { pattern: /delaware/i, name: 'Delaware' },
      { pattern: /pennsylvania/i, name: 'Pennsylvania' },
      { pattern: /new jersey/i, name: 'New Jersey' },
      { pattern: /connecticut/i, name: 'Connecticut' },
      { pattern: /rhode island/i, name: 'Rhode Island' },
      { pattern: /massachusetts/i, name: 'Massachusetts' },
      { pattern: /vermont/i, name: 'Vermont' },
      { pattern: /new hampshire/i, name: 'New Hampshire' },
      { pattern: /maine/i, name: 'Maine' },
      { pattern: /ohio/i, name: 'Ohio' },
      { pattern: /michigan/i, name: 'Michigan' },
      { pattern: /indiana/i, name: 'Indiana' },
      { pattern: /illinois/i, name: 'Illinois' },
      { pattern: /wisconsin/i, name: 'Wisconsin' },
      { pattern: /minnesota/i, name: 'Minnesota' },
      { pattern: /iowa/i, name: 'Iowa' },
      { pattern: /missouri/i, name: 'Missouri' },
      { pattern: /arkansas/i, name: 'Arkansas' },
      { pattern: /louisiana/i, name: 'Louisiana' },
      { pattern: /mississippi/i, name: 'Mississippi' },
      { pattern: /oklahoma/i, name: 'Oklahoma' },
      { pattern: /kansas/i, name: 'Kansas' },
      { pattern: /nebraska/i, name: 'Nebraska' },
      { pattern: /south dakota/i, name: 'South Dakota' },
      { pattern: /north dakota/i, name: 'North Dakota' },
      { pattern: /montana/i, name: 'Montana' },
      { pattern: /wyoming/i, name: 'Wyoming' },
      { pattern: /idaho/i, name: 'Idaho' },
      { pattern: /utah/i, name: 'Utah' },
      { pattern: /arizona/i, name: 'Arizona' },
      { pattern: /new mexico/i, name: 'New Mexico' },
      { pattern: /oregon/i, name: 'Oregon' },
      { pattern: /alaska/i, name: 'Alaska' },
      { pattern: /hawaii/i, name: 'Hawaii' }
    ];
    
    for (const stateMatch of stateMatches) {
      if (stateMatch.pattern.test(lowerQuery)) {
        detectedState = stateMatch.name;
        console.log(`Detected state (fallback): ${detectedState}`);
        break;
      }
    }
  }
  
  const hasStateKeyword = detectedState !== null;
  
  // Dynamically fetch all brands from database
  let detectedBrand = null;
  try {
    const { data: brands, error } = await supabase
      .from('brands')
      .select('name');
    
    if (!error && brands) {
      // Check for brand matches (case insensitive)
      for (const brand of brands) {
        const brandPattern = new RegExp(`\\b${brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (brandPattern.test(lowerQuery)) {
          detectedBrand = brand.name;
          console.log(`Detected brand: ${detectedBrand}`);
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching brands:', error);
  }
  
  // Enhanced product name extraction with hierarchy (specific to general)
  let detectedProduct = null;
  const productMatches = [
    // Specific product variants first
    { pattern: /juice head pouches?/i, name: 'Pouches' },
    { pattern: /5k disposables?/i, name: '5K Disposable' },
    { pattern: /galaxy treats disposables?/i, name: 'Disposable' },
    
    // General product types
    { pattern: /disposables?/i, name: 'Disposable' },
    { pattern: /pouches?/i, name: 'Pouches' },
    { pattern: /gummies/i, name: 'Gummies' },
    { pattern: /pre-?rolls?/i, name: 'Pre-Roll' },
    { pattern: /vapes?/i, name: 'Vape' },
    { pattern: /carts?/i, name: 'Cart' },
    { pattern: /edibles?/i, name: 'Edible' },
    
    // Brand fallbacks (should be last)
    { pattern: /juice head/i, name: 'Juice Head' },
    { pattern: /galaxy treats/i, name: 'Galaxy Treats' }
  ];
  
  for (const productMatch of productMatches) {
    if (productMatch.pattern.test(lowerQuery)) {
      detectedProduct = productMatch.name;
      console.log(`Detected product: ${detectedProduct}`);
      break;
    }
  }
  
  // Determine if this is a product legality query
  const hasProductKeyword = detectedProduct !== null;
  const isProductLegality = (hasLegalityKeyword || hasStateKeyword) && (hasProductKeyword || detectedBrand);
  
  console.log('Enhanced query analysis result:', {
    isProductLegality,
    product: detectedProduct,
    brand: detectedBrand,
    state: detectedState,
    hasLegalityKeyword,
    hasStateKeyword,
    hasProductKeyword,
    isListQuery
  });
  
  return {
    isProductLegality,
    product: detectedProduct,
    brand: detectedBrand,
    state: detectedState,
    isListQuery
  };
}

async function queryStateMap(supabase: any, params: any) {
  try {
    console.log('Querying state map with params:', params);
    
    const { product, brand, state, isListQuery } = params;
    
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
    
    // Step 2: Handle list queries vs specific product queries differently
    if (isListQuery && brand) {
      console.log(`List query detected for brand: ${brand}`);
      
      // Find the brand
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', `%${brand}%`)
        .limit(1);
      
      if (!brandError && brandData && brandData.length > 0) {
        const foundBrand = brandData[0];
        console.log(`Found brand: ${foundBrand.name} with ID: ${foundBrand.id}`);
        
        // Get all products from this brand that are legal in this state
        const { data: legalProducts, error: legalError } = await supabase
          .from('state_allowed_products')
          .select(`
            products (
              id,
              name,
              brands (
                id,
                name
              )
            )
          `)
          .eq('state_id', foundState.id)
          .eq('products.brand_id', foundBrand.id);
        
        if (!legalError && legalProducts && legalProducts.length > 0) {
          console.log(`Found ${legalProducts.length} legal products for ${foundBrand.name} in ${foundState.name}`);
          
          const productList = legalProducts
            .map(item => item.products)
            .filter(product => product !== null)
            .map(product => product.name);
          
          return [{
            title: `${foundBrand.name} Products Legal in ${foundState.name}`,
            content: `The following ${foundBrand.name} products are legal in ${foundState.name}:\n\n${productList.map(name => `• ${name}`).join('\n')}\n\nTotal: ${productList.length} products`,
            state: foundState.name,
            brand: foundBrand.name,
            productCount: productList.length,
            productList: productList,
            isLegal: true,
            source: 'state_map'
          }];
        } else {
          console.log(`No legal products found for ${foundBrand.name} in ${foundState.name}`);
          return [{
            title: `${foundBrand.name} Products in ${foundState.name}`,
            content: `No ${foundBrand.name} products are currently legal in ${foundState.name}. Please check with compliance for the latest regulations.`,
            state: foundState.name,
            brand: foundBrand.name,
            productCount: 0,
            isLegal: false,
            source: 'state_map'
          }];
        }
      }
    }
    
    // Enhanced product search with brand + product combination (existing logic)
    let productResults = [];
    
    if (brand && product) {
      console.log(`Searching for brand: ${brand} and product: ${product}`);
      
      // Step 2a: Find the brand
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', `%${brand}%`)
        .limit(1);
      
      if (!brandError && brandData && brandData.length > 0) {
        const foundBrand = brandData[0];
        console.log(`Found brand: ${foundBrand.name} with ID: ${foundBrand.id}`);
        
        // Step 2b: Search for products from this brand matching the product type
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
          .eq('brand_id', foundBrand.id)
          .ilike('name', `%${product}%`);
        
        if (!brandProductsError && brandProducts && brandProducts.length > 0) {
          console.log(`Found ${brandProducts.length} products for brand ${foundBrand.name} matching "${product}"`);
          
          // Prioritize exact matches
          const exactMatch = brandProducts.find(p => 
            p.name.toLowerCase() === product.toLowerCase()
          );
          
          if (exactMatch) {
            productResults = [exactMatch];
            console.log(`Found exact product match: ${exactMatch.name}`);
          } else {
            productResults = brandProducts;
            console.log(`Using closest product matches for ${product}`);
          }
        }
      }
    } else if (product) {
      // Fallback: search by product only
      console.log(`Searching for product only: ${product}`);
      
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
      
      if (!exactError && exactProducts && exactProducts.length > 0) {
        console.log(`Found ${exactProducts.length} products matching "${product}"`);
        
        // If we have a brand preference, filter by it
        if (brand) {
          const brandFiltered = exactProducts.filter(p => 
            p.brands?.name && p.brands.name.toLowerCase().includes(brand.toLowerCase())
          );
          if (brandFiltered.length > 0) {
            productResults = brandFiltered;
            console.log(`Filtered to ${brandFiltered.length} products matching brand preference`);
          } else {
            productResults = exactProducts;
          }
        } else {
          // Prioritize exact name matches
          const exactMatch = exactProducts.find(p => 
            p.name.toLowerCase() === product.toLowerCase()
          );
          productResults = exactMatch ? [exactMatch] : exactProducts;
        }
      }
    } else if (brand) {
      // Search by brand only
      console.log(`Searching for brand only: ${brand}`);
      
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', `%${brand}%`)
        .limit(1);
      
      if (!brandError && brandData && brandData.length > 0) {
        const foundBrand = brandData[0];
        console.log(`Found brand: ${foundBrand.name}`);
        
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
          .eq('brand_id', foundBrand.id);
        
        if (!brandProductsError && brandProducts) {
          productResults = brandProducts;
          console.log(`Found ${productResults.length} products for brand ${foundBrand.name}`);
        }
      }
    }
    
    // Step 3: Check product legality in the state
    if (productResults.length > 0) {
      console.log(`Checking legality for ${productResults.length} products`);
      
      // Check the first (most relevant) product
      const productItem = productResults[0];
      console.log(`Checking legality for product ID ${productItem.id} (${productItem.name}) in state ID ${foundState.id}`);
      
      const { data: legalityData, error: legalityError } = await supabase
        .from('state_allowed_products')
        .select('*')
        .eq('state_id', foundState.id)
        .eq('product_id', productItem.id);
      
      if (legalityError) {
        console.error('Error checking legality:', legalityError);
        return [];
      }
      
      const isLegal = legalityData && legalityData.length > 0;
      console.log(`Product ${productItem.name} is ${isLegal ? 'LEGAL' : 'NOT LEGAL'} in ${foundState.name}`);
      
      return [{
        title: `${productItem.name} Legality in ${foundState.name}`,
        content: `${productItem.name} from ${productItem.brands?.name || 'Unknown Brand'} is ${isLegal ? 'legal' : 'not legal'} in ${foundState.name}.`,
        state: foundState.name,
        product: productItem.name,
        brand: productItem.brands?.name,
        isLegal,
        source: 'state_map'
      }];
    } else {
      console.log('No products found, returning general state info');
      const searchTerm = brand && product ? `${brand} ${product}` : (product || brand || 'the specified product');
      return [{
        title: `Product Information for ${foundState.name}`,
        content: `No specific product information found for "${searchTerm}" in ${foundState.name}. Please check the product name or contact compliance for verification.`,
        state: foundState.name,
        product: product,
        brand: brand,
        isLegal: null,
        source: 'state_map'
      }];
    }
    
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
- Give a clear YES/NO answer about legality when asking about specific products
- For "which products" or "what products" questions, provide a comprehensive numbered list
- Format product lists clearly with bullet points or numbers
- Cite the specific product, brand, and state
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
