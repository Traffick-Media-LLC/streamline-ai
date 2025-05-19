
// Import required Deno modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to log events in the edge function
async function logEvent(supabase, requestId, eventType, component, message, metadata = {}) {
  try {
    const { error } = await supabase.from('chat_logs').insert({
      request_id: requestId,
      event_type: eventType,
      component,
      message,
      metadata
    });
    
    if (error) {
      console.error('Error logging chat event:', error);
    }
  } catch (err) {
    console.error('Exception logging chat event:', err);
  }
}

// Function to check if a message is asking about product legality in a state
function isProductLegalityQuestion(message) {
  const legalityKeywords = [
    'legal', 'allowed', 'available', 'permitted', 'lawful', 'compliant',
    'illegal', 'banned', 'prohibited', 'restricted', 'not allowed'
  ];
  
  const stateKeywords = [
    'state', 'in', 'at', 'region', 'location', 'area'
  ];
  
  message = message.toLowerCase();
  
  // Check for presence of legality-related words
  const hasLegalityKeyword = legalityKeywords.some(keyword => message.includes(keyword));
  // Check for state-related words
  const hasStateKeyword = stateKeywords.some(keyword => message.includes(keyword));
  
  return hasLegalityKeyword && hasStateKeyword;
}

// Function to extract state name from a message
function extractStateFromMessage(message) {
  // List of US states
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  
  // Check for state names in the message
  const messageLower = message.toLowerCase();
  for (const state of states) {
    if (messageLower.includes(state.toLowerCase())) {
      return state;
    }
  }
  
  return null;
}

// Function to extract product or brand name from a message
function extractProductOrBrandFromMessage(message) {
  // This is a simplified extraction - in production, 
  // this might use NLP techniques or a more sophisticated approach
  const messageLower = message.toLowerCase();
  
  // Look for product/brand name patterns
  // This assumes the message mentions the product clearly in some way
  // These are simplistic patterns - would need refinement in production
  let match = null;
  
  // Pattern: "Product X" or "Brand X"
  const productMatch = messageLower.match(/product\s+([a-z0-9\s]+)/i);
  const brandMatch = messageLower.match(/brand\s+([a-z0-9\s]+)/i);
  
  if (productMatch) {
    match = productMatch[1].trim();
  } else if (brandMatch) {
    match = brandMatch[1].trim();
  }
  
  return match;
}

// Function to query the database for product legality in a state
async function checkProductLegality(supabase, stateName, productNameOrBrand, requestId) {
  try {
    // Find the state ID first
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id')
      .ilike('name', `%${stateName}%`)
      .limit(1);
    
    if (stateError || !stateData || stateData.length === 0) {
      return { 
        found: false, 
        error: 'State not found in database',
        source: 'database_query'
      };
    }
    
    const stateId = stateData[0].id;
    
    // First try to find a direct match to a product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        brand_id,
        brands (
          id,
          name,
          logo_url
        )
      `)
      .ilike('name', `%${productNameOrBrand}%`)
      .limit(10);
      
    // If we found products, check if they're allowed in the state
    if (!productError && productData && productData.length > 0) {
      // Get the IDs of all products that matched
      const productIds = productData.map(p => p.id);
      
      // Check which of these products are allowed in the state
      const { data: allowedProducts, error: allowedError } = await supabase
        .from('state_allowed_products')
        .select(`
          product_id,
          products (
            id,
            name,
            brands (
              id, 
              name,
              logo_url
            )
          )
        `)
        .eq('state_id', stateId)
        .in('product_id', productIds);
        
      if (!allowedError && allowedProducts && allowedProducts.length > 0) {
        return {
          found: true,
          legal: true,
          state: stateName,
          products: allowedProducts.map(ap => ({
            name: ap.products.name,
            brand: ap.products.brands ? ap.products.brands.name : 'Unknown',
            brandLogo: ap.products.brands ? ap.products.brands.logo_url : null
          })),
          source: 'product_database'
        };
      } else {
        // Products found but not allowed in this state
        return {
          found: true,
          legal: false,
          state: stateName,
          products: productData.map(p => ({
            name: p.name,
            brand: p.brands ? p.brands.name : 'Unknown',
            brandLogo: p.brands ? p.brands.logo_url : null
          })),
          source: 'product_database'
        };
      }
    }
    
    // If no product match, try to find by brand
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('id, name, logo_url')
      .ilike('name', `%${productNameOrBrand}%`)
      .limit(5);
      
    if (!brandError && brandData && brandData.length > 0) {
      // Get products for these brands
      const brandIds = brandData.map(b => b.id);
      
      const { data: brandProducts, error: bpError } = await supabase
        .from('products')
        .select('id, name, brand_id')
        .in('brand_id', brandIds);
        
      if (!bpError && brandProducts && brandProducts.length > 0) {
        // Check which of these brand's products are allowed in the state
        const productIds = brandProducts.map(p => p.id);
        
        const { data: allowedBrandProducts, error: abpError } = await supabase
          .from('state_allowed_products')
          .select(`
            product_id,
            products (
              id,
              name, 
              brand_id,
              brands (
                id,
                name,
                logo_url
              )
            )
          `)
          .eq('state_id', stateId)
          .in('product_id', productIds);
          
        const brandsInfo = {};
        brandData.forEach(brand => {
          brandsInfo[brand.id] = {
            name: brand.name,
            logo_url: brand.logo_url
          };
        });
        
        if (!abpError && allowedBrandProducts && allowedBrandProducts.length > 0) {
          // Some products from this brand are allowed
          return {
            found: true,
            legal: true,
            state: stateName,
            brand: brandData[0].name,
            brandLogo: brandData[0].logo_url,
            products: allowedBrandProducts.map(abp => ({
              name: abp.products.name,
              brand: abp.products.brands ? abp.products.brands.name : brandData[0].name,
              brandLogo: abp.products.brands ? abp.products.brands.logo_url : brandData[0].logo_url
            })),
            source: 'brand_database'
          };
        } else {
          // Brand found but no products allowed in this state
          return {
            found: true,
            legal: false,
            state: stateName,
            brand: brandData[0].name,
            brandLogo: brandData[0].logo_url,
            message: `No products from ${brandData[0].name} are permitted in ${stateName}.`,
            source: 'brand_database'
          };
        }
      } else {
        // Brand found but no products for this brand
        return {
          found: true,
          brand: brandData[0].name,
          state: stateName,
          message: `Found brand ${brandData[0].name}, but no products are registered in the database.`,
          source: 'brand_database'
        };
      }
    }
    
    // If we get here, we didn't find any matching products or brands
    return {
      found: false,
      state: stateName,
      message: `No information found for "${productNameOrBrand}" in ${stateName}.`,
      source: 'no_match'
    };
    
  } catch (error) {
    console.error('Error checking product legality:', error);
    return { 
      found: false,
      error: `Error querying product database: ${error.message}`,
      source: 'database_error'
    };
  }
}

// Main server function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const requestTime = new Date();
    const reqJson = await req.json();
    const { message, chatId, chatHistory, requestId } = reqJson;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Use the Supabase JS client in Deno
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Special mode for health check
    if (reqJson && reqJson.mode === "health_check") {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    await logEvent(supabase, requestId, 'chat_request_received', 'chat_function', 'Chat request received', {
      chatId,
      hasHistory: chatHistory && chatHistory.length > 0
    });
    
    // Check if the message is asking about product legality
    let productLegalityData = null;
    
    if (isProductLegalityQuestion(message)) {
      const stateName = extractStateFromMessage(message);
      const productOrBrand = extractProductOrBrandFromMessage(message);
      
      if (stateName && productOrBrand) {
        await logEvent(supabase, requestId, 'product_legality_check', 'chat_function', 
          `Checking legality for "${productOrBrand}" in "${stateName}"`, {
            state: stateName,
            productOrBrand: productOrBrand
        });
        
        // Query the database for this product-state combination
        productLegalityData = await checkProductLegality(supabase, stateName, productOrBrand, requestId);
        
        await logEvent(supabase, requestId, 'product_legality_result', 'chat_function', 
          'Product legality check completed', productLegalityData);
      }
    }
    
    // Prepare messages for OpenAI
    let messages = [];
    
    // Add system prompt
    let baseSystemPrompt = `You are the AI assistant for Streamline Group Employees inside the Streamline Group Portal. 

Your role is to intelligently answer employee questions about product legality, information about Streamline Group's products, employee resources, and company documents.

Follow this strict source hierarchy based on the type of question:

1. If the user asks about product legality or regulatory status by state (e.g., "Is Delta-8 legal in Texas?"), you must check the Supabase backend database that powers the U.S. State Map.

2. If information about product legality is available from the database, you MUST use that as your primary source of truth. 

3. If the user asks general questions about company information (e.g., "What brands does Streamline sell?" or "Where can I find the marketing request form?"), reference the AI Knowledge Base.

When answering product legality questions:
- Be definitive when database information is available
- Clearly state which products are legal or not legal in specific states
- Include brand information when available
- Do not speculate on legal status when database information is missing

Always cite your sources where appropriate (e.g., 'According to our State Map database...' or 'Based on the Knowledge Base...').

Answer in a professional, clear, and helpful tone. If you cannot find an answer from the available sources, politely let the user know and suggest submitting a request via the Marketing Request Form or contacting the appropriate department.`;

    // If we have product legality data, append it to the system prompt
    if (productLegalityData) {
      baseSystemPrompt += `\n\nIMPORTANT: I've queried our product legality database and found the following information about the user's question:
${JSON.stringify(productLegalityData, null, 2)}

Use this information to answer the current question. This data comes directly from our regulatory database and should be considered the final authority on product legality by state.`;
    }

    messages.push({
      role: "system",
      content: baseSystemPrompt
    });
    
    // Add chat history if available
    if (chatHistory && chatHistory.length > 0) {
      // Format chat history for OpenAI context
      messages = messages.concat(
        chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      );
      
      await logEvent(supabase, requestId, 'chat_history_processed', 'chat_function', 
        `Processed ${chatHistory.length} chat history messages`);
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: message
    });
    
    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    // Call OpenAI API
    await logEvent(supabase, requestId, 'openai_request_started', 'chat_function', 
      'Sending request to OpenAI');
      
    const openaiStartTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    const responseTime = Date.now() - openaiStartTime;
    
    if (!response.ok) {
      const error = await response.text();
      await logEvent(supabase, requestId, 'openai_request_failed', 'chat_function', 
        `OpenAI request failed: ${error}`, { status: response.status });
        
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    
    await logEvent(supabase, requestId, 'openai_response_received', 'chat_function', 
      'Received response from OpenAI', { 
        responseTime, 
        tokens: data.usage?.total_tokens || 0,
        model: data.model
      });
    
    // Respond with the AI assistant's message and metadata
    const responseData = {
      message: data.choices[0].message.content,
      model: data.model,
      tokensUsed: data.usage?.total_tokens || 0,
      responseTime,
      sourceInfo: productLegalityData || null
    };
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
    
  } catch (error) {
    console.error('Error processing chat request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Error processing your request: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
