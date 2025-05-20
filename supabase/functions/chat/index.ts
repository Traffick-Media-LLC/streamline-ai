
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

// Improved function to identify common product categories with enhanced hemp product awareness
const PRODUCT_CATEGORIES = {
  NICOTINE: ['pouches', 'pouch', 'vape', 'vapes', 'e-liquid', 'e-juice', 'ejuice', 'eliquid', 'disposable', 'disposables', 'mod', 'mods', 'cigarette', 'cigarettes', 'tobacco', 'nicotine'],
  HEMP: ['delta-8', 'delta-10', 'delta 8', 'delta 10', 'cbd', 'hemp', 'thc', 'gummies', 'edible', 'edibles', 'thca', 'thc-a', 'thcp', 'thc-p', 'phc', 'cbn', 'thcv', 'galaxy treats', 'mcro'],
  KRATOM: ['kratom', 'mitragyna', 'speciosa', 'capsules', 'extract'],
};

// Function to identify the likely product category from a message
function identifyProductCategory(message) {
  message = message?.toLowerCase() || '';
  
  for (const [category, keywords] of Object.entries(PRODUCT_CATEGORIES)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      return category;
    }
  }
  
  return null;
}

// Improved function to check if a message is asking about product legality in a state
function isProductLegalityQuestion(message) {
  // Safety check to prevent errors if message is undefined or null
  if (!message) return false;
  
  const legalityPatterns = [
    /legal\s+in/i,
    /allowed\s+in/i,
    /available\s+in/i,
    /permitted\s+in/i,
    /sell\s+in/i,
    /sold\s+in/i,
    /banned\s+in/i,
    /prohibited\s+in/i,
    /restricted\s+in/i,
    /legal.*state/i,
    /are\s+\w+\s+legal/i, // Matches "are pouches legal"
  ];
  
  message = message.toLowerCase();
  
  // Check for presence of legality-related patterns
  return legalityPatterns.some(pattern => pattern.test(message));
}

// Function to extract state name from a message
function extractStateFromMessage(message) {
  // Safety check to prevent errors if message is undefined or null
  if (!message) return null;
  
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

// Enhanced function to extract product or brand from a message with special handling for hemp brands
async function extractProductOrBrandFromMessage(supabase, message, requestId) {
  // Safety check to prevent errors if message is undefined or null
  if (!message) return null;
  
  const messageLower = message.toLowerCase();
  
  try {
    // First, fetch common product names from the database to look for
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id, product_type, brands(name)')
      .order('name');
    
    if (productsError) {
      console.error('Error fetching products for extraction:', productsError);
      await logEvent(supabase, requestId, 'product_extraction_error', 'extract_product', 
        'Failed to fetch products for extraction', { error: productsError.message });
      return null;
    }
    
    // Fetch brands to check against
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .order('name');
      
    if (brandsError) {
      console.error('Error fetching brands for extraction:', brandsError);
      await logEvent(supabase, requestId, 'product_extraction_error', 'extract_product', 
        'Failed to fetch brands for extraction', { error: brandsError.message });
      return null;
    }
    
    // Special handling for Galaxy Treats and MCRO brands (hemp products)
    const hempBrands = ['galaxy treats', 'mcro'];
    for (const brand of hempBrands) {
      if (messageLower.includes(brand)) {
        await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
          `Identified hemp brand: ${brand}`, { category: 'HEMP' });
        return brand;
      }
    }
    
    // Identify any explicit brand mentions
    let brandMatch = null;
    for (const brand of brands) {
      if (messageLower.includes(brand.name.toLowerCase())) {
        brandMatch = brand.name;
        break;
      }
    }
    
    // Check for direct product mentions
    let productMatch = null;
    let productType = null;
    for (const product of products) {
      // Check for both singular and potential plural forms
      const productName = product.name.toLowerCase();
      const pluralName = productName.endsWith('s') ? productName : productName + 's';
      
      if (messageLower.includes(productName) || messageLower.includes(pluralName)) {
        productMatch = {
          name: product.name,
          brand: product.brands?.name || null,
          type: product.product_type || 'unknown'
        };
        productType = product.product_type;
        break;
      }
    }
    
    // If we found a direct product match, return it
    if (productMatch) {
      await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
        `Extracted product: ${productMatch.name}`, { product: productMatch });
      return productMatch.name;
    }
    
    // If we found a brand match, return it
    if (brandMatch) {
      await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
        `Extracted brand: ${brandMatch}`);
      return brandMatch;
    }
    
    // Handle common category words like "pouches", "vapes", "disposables", etc.
    const categories = {
      pouches: ["nicotine pouches", "tobacco-free pouches", "pouch"],
      vapes: ["vape", "disposable vape", "vaporizer", "disposable"],
      gummies: ["gummy", "edible"],
      tinctures: ["tincture", "oil", "drops"],
      cigarettes: ["cigarette", "cig"],
    };
    
    for (const [category, synonyms] of Object.entries(categories)) {
      if ([category, ...synonyms].some(term => messageLower.includes(term.toLowerCase()))) {
        // Try to find an associated brand if mentioned
        await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
          `Extracted product category: ${category}`);
        return category;
      }
    }
    
    // Look for explicit product/brand patterns as a fallback
    const productMatch1 = messageLower.match(/product\s+([a-z0-9\s]+)/i);
    const brandMatch1 = messageLower.match(/brand\s+([a-z0-9\s]+)/i);
    
    if (productMatch1) {
      return productMatch1[1].trim();
    } else if (brandMatch1) {
      return brandMatch1[1].trim();
    }
    
    // If we get here, we don't have a clear product or brand
    const productCategory = identifyProductCategory(message);
    if (productCategory) {
      await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
        `Identified product category: ${productCategory}`);
      // Return the general category as a fallback
      return productCategory.toLowerCase();
    }
    
    return null;
  } catch (error) {
    console.error('Error in product/brand extraction:', error);
    await logEvent(supabase, requestId, 'product_extraction_error', 'extract_product', 
      'Error in extractProductOrBrandFromMessage', { error: error.message });
    return null;
  }
}

// Enhanced function to get product ingredients with ingredient regulation info
async function getProductIngredients(supabase, productId, requestId) {
  try {
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select('ingredient, product_type, concentration, regulation_notes')
      .eq('product_id', productId);
      
    if (error) {
      console.error('Error fetching product ingredients:', error);
      await logEvent(supabase, requestId, 'ingredient_fetch_error', 'get_product_ingredients', 
        'Failed to fetch product ingredients', { productId, error: error.message });
      return null;
    }
    
    return ingredients;
  } catch (error) {
    console.error('Error in getProductIngredients:', error);
    await logEvent(supabase, requestId, 'ingredient_fetch_error', 'get_product_ingredients', 
      'Exception in getProductIngredients', { productId, error: error.message });
    return null;
  }
}

// Function to get ingredient regulation information for a given state
async function getIngredientRegulationsForState(supabase, ingredient, stateId, requestId) {
  try {
    const { data: regulations, error } = await supabase
      .from('ingredient_state_regulations')
      .select('regulation_type, regulation_text, legal_status, effective_date')
      .eq('state_id', stateId)
      .ilike('ingredient', `%${ingredient}%`);
      
    if (error) {
      console.error('Error fetching ingredient regulations:', error);
      await logEvent(supabase, requestId, 'ingredient_regulation_fetch_error', 'get_ingredient_regulations', 
        'Failed to fetch ingredient regulations', { ingredient, stateId, error: error.message });
      return null;
    }
    
    return regulations;
  } catch (error) {
    console.error('Error in getIngredientRegulationsForState:', error);
    await logEvent(supabase, requestId, 'ingredient_regulation_fetch_error', 'get_ingredient_regulations', 
      'Exception in getIngredientRegulationsForState', { ingredient, stateId, error: error.message });
    return null;
  }
}

// Improved function to query the database for product legality in a state with enhanced ingredient analysis
async function checkProductLegality(supabase, stateName, productNameOrBrand, requestId) {
  try {
    await logEvent(supabase, requestId, 'legality_check_start', 'check_product_legality', 
      `Starting legality check for "${productNameOrBrand}" in ${stateName}`);
    
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
    
    // Special handling for hemp product brands (Galaxy Treats, MCRO)
    const isHempBrand = ['galaxy treats', 'mcro'].some(brand => 
      productNameOrBrand.toLowerCase().includes(brand)
    );
    
    // First try to find a direct match to a product
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        product_type,
        brand_id,
        brands (
          id,
          name,
          logo_url
        )
      `)
      .ilike('name', `%${productNameOrBrand}%`)
      .order('name')
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
            product_type,
            brands (
              id, 
              name,
              logo_url
            )
          )
        `)
        .eq('state_id', stateId)
        .in('product_id', productIds);
        
      // Fetch ingredients for the products with enhanced ingredient info
      const productIngredientsMap = {};
      const ingredientRegulationsMap = {};
      
      for (const pid of productIds) {
        const ingredients = await getProductIngredients(supabase, pid, requestId);
        if (ingredients && ingredients.length > 0) {
          productIngredientsMap[pid] = ingredients;
          
          // For each ingredient, fetch state-specific regulations
          for (const ingredient of ingredients) {
            if (!ingredient.ingredient) continue;
            
            const regulations = await getIngredientRegulationsForState(
              supabase, 
              ingredient.ingredient, 
              stateId, 
              requestId
            );
            
            if (regulations && regulations.length > 0) {
              if (!ingredientRegulationsMap[ingredient.ingredient]) {
                ingredientRegulationsMap[ingredient.ingredient] = [];
              }
              ingredientRegulationsMap[ingredient.ingredient] = regulations;
            }
          }
        }
      }
      
      if (!allowedError && allowedProducts && allowedProducts.length > 0) {
        const result = {
          found: true,
          legal: true,
          state: stateName,
          products: allowedProducts.map(ap => ({
            name: ap.products.name,
            type: ap.products.product_type || 'Unknown',
            brand: ap.products.brands ? ap.products.brands.name : 'Unknown',
            brandLogo: ap.products.brands ? ap.products.brands.logo_url : null,
            ingredients: productIngredientsMap[ap.product_id] || []
          })),
          category: identifyProductCategory(productNameOrBrand) || 'Unknown',
          ingredientRegulations: ingredientRegulationsMap,
          source: 'product_database',
          date: new Date().toISOString().split('T')[0]
        };
        
        // Log the ingredients information
        await logEvent(supabase, requestId, 'product_ingredients_fetched', 'check_product_legality', 
          `Found ingredients for products in ${stateName}`, { 
            ingredients: productIngredientsMap,
            regulations: ingredientRegulationsMap 
          });
          
        return result;
      } else {
        // Products found but not allowed in this state
        return {
          found: true,
          legal: false,
          state: stateName,
          products: productData.map(p => ({
            name: p.name,
            type: p.product_type || 'Unknown',
            brand: p.brands ? p.brands.name : 'Unknown',
            brandLogo: p.brands ? p.brands.logo_url : null,
            ingredients: productIngredientsMap[p.id] || []
          })),
          category: identifyProductCategory(productNameOrBrand) || 'Unknown',
          ingredientRegulations: ingredientRegulationsMap,
          source: 'product_database',
          date: new Date().toISOString().split('T')[0]
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
        .select('id, name, brand_id, product_type')
        .in('brand_id', brandIds)
        .order('name');
        
      if (!bpError && brandProducts && brandProducts.length > 0) {
        // Fetch ingredients for all products of this brand with enhanced ingredient info
        const productIngredientsMap = {};
        const ingredientRegulationsMap = {};
        
        for (const product of brandProducts) {
          const ingredients = await getProductIngredients(supabase, product.id, requestId);
          if (ingredients && ingredients.length > 0) {
            productIngredientsMap[product.id] = ingredients;
            
            // For each ingredient, fetch state-specific regulations
            for (const ingredient of ingredients) {
              if (!ingredient.ingredient) continue;
              
              const regulations = await getIngredientRegulationsForState(
                supabase, 
                ingredient.ingredient, 
                stateId, 
                requestId
              );
              
              if (regulations && regulations.length > 0) {
                if (!ingredientRegulationsMap[ingredient.ingredient]) {
                  ingredientRegulationsMap[ingredient.ingredient] = [];
                }
                ingredientRegulationsMap[ingredient.ingredient] = regulations;
              }
            }
          }
        }
        
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
              product_type,
              brands (
                id,
                name,
                logo_url
              )
            )
          `)
          .eq('state_id', stateId)
          .in('product_id', productIds)
          .order('products(name)');
          
        const brandsInfo = {};
        brandData.forEach(brand => {
          brandsInfo[brand.id] = {
            name: brand.name,
            logo_url: brand.logo_url
          };
        });
        
        if (!abpError && allowedBrandProducts && allowedBrandProducts.length > 0) {
          // Some products from this brand are allowed
          const result = {
            found: true,
            legal: true,
            state: stateName,
            brand: brandData[0].name,
            brandLogo: brandData[0].logo_url,
            products: allowedBrandProducts.map(abp => ({
              name: abp.products.name,
              type: abp.products.product_type || 'Unknown',
              brand: abp.products.brands ? abp.products.brands.name : brandData[0].name,
              brandLogo: abp.products.brands ? abp.products.brands.logo_url : brandData[0].logo_url,
              ingredients: productIngredientsMap[abp.product_id] || []
            })),
            category: identifyProductCategory(productNameOrBrand) || (isHempBrand ? 'HEMP' : 'Unknown'),
            ingredientRegulations: ingredientRegulationsMap,
            source: 'brand_database',
            date: new Date().toISOString().split('T')[0],
            isHempBrand: isHempBrand
          };
          
          // Log the ingredients for this brand's products
          await logEvent(supabase, requestId, 'brand_ingredients_fetched', 'check_product_legality', 
            `Found ingredients for ${brandData[0].name} products in ${stateName}`, {
              regulationCount: Object.keys(ingredientRegulationsMap).length
            });
            
          return result;
        } else {
          // Brand found but no products allowed in this state
          // Include ingredient information for research purposes
          const allBrandProductsWithIngredients = brandProducts.map(bp => ({
            name: bp.name,
            type: bp.product_type || 'Unknown',
            brand: brandData[0].name,
            ingredients: productIngredientsMap[bp.id] || []
          }));
          
          return {
            found: true,
            legal: false,
            state: stateName,
            brand: brandData[0].name,
            brandLogo: brandData[0].logo_url,
            message: `No products from ${brandData[0].name} are permitted in ${stateName}.`,
            productIngredients: allBrandProductsWithIngredients,
            category: identifyProductCategory(productNameOrBrand) || (isHempBrand ? 'HEMP' : 'Unknown'),
            ingredientRegulations: ingredientRegulationsMap,
            source: 'brand_database',
            date: new Date().toISOString().split('T')[0],
            isHempBrand: isHempBrand
          };
        }
      } else {
        // Brand found but no products for this brand
        return {
          found: true,
          brand: brandData[0].name,
          state: stateName,
          message: `Found brand ${brandData[0].name}, but no products are registered in the database.`,
          source: 'brand_database',
          date: new Date().toISOString().split('T')[0]
        };
      }
    }
    
    // If we get here, we didn't find any matching products or brands
    return {
      found: false,
      state: stateName,
      message: `No information found for "${productNameOrBrand}" in ${stateName}.`,
      source: 'no_match',
      date: new Date().toISOString().split('T')[0]
    };
    
  } catch (error) {
    console.error('Error checking product legality:', error);
    return { 
      found: false,
      error: `Error querying product database: ${error.message}`,
      source: 'database_error',
      date: new Date().toISOString().split('T')[0]
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
    let reqJson;
    
    try {
      reqJson = await req.json();
      // Log the raw request for debugging
      console.log('Raw request received:', JSON.stringify(reqJson));
    } catch (parseError) {
      console.error("Error parsing request JSON:", parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Handle both possible parameter names (message or content)
    const userMessage = reqJson.content || reqJson.message;
    const { chatId, chatHistory, requestId } = reqJson;
    
    // Validate required parameters
    if (!userMessage) {
      console.error('Required parameter missing: No message content found in request');
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: No message content found in request',
          details: 'The request must include either a "content" or "message" field'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Check if required environment variables are available
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Use the Supabase JS client in Deno
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      var supabase = createClient(supabaseUrl, supabaseServiceKey);
    } catch (supabaseError) {
      console.error('Error initializing Supabase client:', supabaseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to initialize database client',
          details: supabaseError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Special mode for health check
    if (reqJson && reqJson.mode === "health_check") {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    try {
      await logEvent(supabase, requestId, 'chat_request_received', 'chat_function', 'Chat request received', {
        chatId,
        hasHistory: chatHistory && chatHistory.length > 0
      });
    } catch (logError) {
      console.error('Error logging chat request:', logError);
      // Continue execution even if logging fails
    }
    
    // Check if the message is asking about product legality
    let productLegalityData = null;
    
    try {
      if (isProductLegalityQuestion(userMessage)) {
        const stateName = extractStateFromMessage(userMessage);
        const productOrBrand = await extractProductOrBrandFromMessage(supabase, userMessage, requestId);
        
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
    } catch (legalityCheckError) {
      console.error('Error checking product legality:', legalityCheckError);
      // Continue execution even if legality check fails
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
- Begin with a clear "LEGAL STATUS: [LEGAL/NOT LEGAL] in [STATE]" heading
- List the brand, products, and primary ingredients in a structured format
- Be definitive when database information is available
- Clearly state which products are legal or not legal in specific states
- Include brand information when available
- Do not speculate on legal status when database information is missing
- When ingredient information is available, use it to provide additional context about why certain products may or may not be legal in specific states
- Always include the date of the information when available

VERY IMPORTANT: The company primarily works with:
1. Nicotine products: especially pouches, vapes, disposables, and other nicotine delivery systems
2. Hemp products: Galaxy Treats and MCRO are hemp product brands that include both disposables and edibles

When users ask about products like "pouches", assume they are referring to NICOTINE pouches (like tobacco-free nicotine pouches) unless explicitly stated otherwise.

Key product categories:
- Pouches: These are nicotine pouches, placed in the mouth (examples: ZYN, VELO, etc.)
- Disposables: These are disposable vape devices (examples: Elf Bar, Hyde, Galaxy Treats, MCRO, etc.)
- Vapes/E-cigarettes: Electronic nicotine delivery devices
- E-liquids: Liquid nicotine for refillable vape devices
- Hemp products: Products containing hemp-derived cannabinoids (THC-A, THCP, Delta-8, etc.) including both edibles and disposables

FORMAT FOR PRODUCT LEGALITY RESPONSES:
Use this structure:
\`\`\`
**LEGAL STATUS: [LEGAL/NOT LEGAL] in [STATE]**

Brand: [Brand Name]
Products: [List of Products]
Primary Ingredients: [Main Ingredients]

---

[Detailed explanation of ingredient regulations in this state]
[Any relevant regulatory context about why these ingredients are regulated]
\`\`\`

Always cite your sources where appropriate (e.g., 'According to our State Map database from [DATE]...' or 'Based on the Knowledge Base...').

Answer in a professional, clear, and helpful tone. If you cannot find an answer from the available sources, politely let the user know and suggest submitting a request via the Marketing Request Form or contacting the appropriate department.`;

    // If we have product legality data, append it to the system prompt
    if (productLegalityData) {
      baseSystemPrompt += `\n\nIMPORTANT: I've queried our product legality database and found the following information about the user's question:
${JSON.stringify(productLegalityData, null, 2)}

Use this information to answer the current question. This data comes directly from our regulatory database and should be considered the final authority on product legality by state. When responding:
- If the query was about a brand, list ALL products from this brand and their legal status in the specified state
- If specific products were found, clearly state their legal status
- Present the information using the format specified above, with the LEGAL STATUS header and ingredient information
- For hemp products (especially Galaxy Treats and MCRO), explain why specific ingredients are regulated in the state being asked about
- Use the ingredient regulations information to explain WHY certain products are regulated differently by state
- Always include the date of the database information when available`;
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
      
      try {
        await logEvent(supabase, requestId, 'chat_history_processed', 'chat_function', 
          `Processed ${chatHistory.length} chat history messages`);
      } catch (logError) {
        console.error('Error logging chat history processing:', logError);
      }
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: userMessage
    });
    
    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key is missing');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: API key is missing',
          message: "I'm sorry, but I'm unable to process your request right now due to a configuration issue. Please contact your IT administrator."
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Call OpenAI API
    try {
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
        const errorText = await response.text();
        try {
          await logEvent(supabase, requestId, 'openai_request_failed', 'chat_function', 
            `OpenAI request failed: ${errorText}`, { status: response.status });
        } catch (logError) {
          console.error('Error logging OpenAI failure:', logError);
        }
        
        console.error(`OpenAI API error (${response.status}): ${errorText}`);
        return new Response(
          JSON.stringify({ 
            error: `Error from AI service: ${response.status}`,
            message: "I'm sorry, but I'm unable to process your request right now. Please try again later."
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const data = await response.json();
      
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Invalid or empty response from OpenAI:", data);
        return new Response(
          JSON.stringify({ 
            error: "Invalid response from AI service",
            message: "I received an invalid response. Please try again."
          }),
          { 
            status: 502, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      try {
        await logEvent(supabase, requestId, 'openai_response_received', 'chat_function', 
          'Received response from OpenAI', { 
            responseTime, 
            tokens: data.usage?.total_tokens || 0,
            model: data.model
          });
      } catch (logError) {
        console.error('Error logging OpenAI response:', logError);
        // Continue execution even if logging fails
      }
      
      // Respond with the AI assistant's message and metadata
      const responseData = {
        message: data.choices[0].message.content,
        model: data.model,
        tokensUsed: data.usage?.total_tokens || 0,
        response_time_ms: responseTime,
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
    } catch (openAiError) {
      console.error('Error calling OpenAI API:', openAiError);
      
      try {
        await logEvent(supabase, requestId, 'openai_request_exception', 'chat_function', 
          `Exception calling OpenAI: ${openAiError.message}`);
      } catch (logError) {
        console.error('Error logging OpenAI exception:', logError);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Error processing AI request',
          message: "I'm sorry, but there was a problem processing your request. Please try again."
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
  } catch (error) {
    console.error('Error processing chat request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Error processing your request: ${error.message}`,
        message: "I'm sorry, but something went wrong. Please try again."
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
