
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
    if (!requestId) {
      console.warn('Missing requestId in logEvent');
      requestId = crypto.randomUUID();
    }

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
  HEMP: ['delta-8', 'delta 8', 'delta-9', 'delta 9', 'delta-10', 'delta 10', 'cbd', 'hemp', 'thc', 'gummies', 'edible', 'edibles', 'thca', 'thc-a', 'thcp', 'thc-p', 'phc', 'cbn', 'thcv', 'galaxy treats', 'mcro'],
  KRATOM: ['kratom', 'mitragyna', 'speciosa', 'capsules', 'extract'],
};

// Known cannabinoid ingredients to search for
const CANNABINOID_INGREDIENTS = [
  'delta 8', 'delta-8', 'd8', 
  'delta 9', 'delta-9', 'd9',
  'delta 10', 'delta-10', 'd10',
  'thca', 'thc-a', 'thc a',
  'thcp', 'thc-p', 'thc p',
  'hhc', 'phc', 'cbn', 'thcv'
];

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

// Function to check if a message is asking about ingredient legality
function isIngredientLegalityQuestion(message) {
  if (!message) return false;
  message = message.toLowerCase();
  
  // Check if message is asking about a specific cannabinoid ingredient
  const hasIngredient = CANNABINOID_INGREDIENTS.some(ingredient => 
    message.includes(ingredient.toLowerCase())
  );
  
  // Check if it's a legality question
  const legalityTerms = ['legal', 'allowed', 'banned', 'prohibited', 'permitted'];
  const hasLegalityTerm = legalityTerms.some(term => message.includes(term));
  
  return hasIngredient && hasLegalityTerm;
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
    /can\s+we\s+sell/i, // Matches "can we sell X in Y"
    /what.*products.*sell/i, // Matches "what products can we sell in X"
    /what.*sell/i, // Matches "what can we sell in X"
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

// Function to extract specific product variants from a message
function extractProductVariant(message) {
  // Safety check
  if (!message) return null;
  
  const messageLower = message.toLowerCase();
  
  // Look for specific cannabinoid variants
  const variantPatterns = {
    'delta 9': [/delta[\s-]*9/i, /d9/i],
    'delta 8': [/delta[\s-]*8/i, /d8/i],
    'delta 10': [/delta[\s-]*10/i, /d10/i],
    'thca': [/thc[\s-]*a/i],
    'thcp': [/thc[\s-]*p/i],
    'hhc': [/hhc/i],
  };
  
  for (const [variant, patterns] of Object.entries(variantPatterns)) {
    if (patterns.some(pattern => pattern.test(messageLower))) {
      return variant;
    }
  }
  
  // Look for product type mentions
  const productTypes = {
    'gummies': [/gummies/i, /gummy/i, /edible/i],
    'disposable': [/disposable/i, /vape/i, /cart/i, /cartridge/i],
    'tincture': [/tincture/i, /oil/i, /drops/i],
    'pouches': [/pouches/i, /pouch/i],
  };
  
  for (const [productType, patterns] of Object.entries(productTypes)) {
    if (patterns.some(pattern => pattern.test(messageLower))) {
      return productType;
    }
  }
  
  return null;
}

// NEW: Function to extract specific cannabinoid ingredient from message
function extractCannabinoidIngredient(message) {
  if (!message) return null;
  
  const messageLower = message.toLowerCase();
  
  // Define patterns for different cannabinoids
  const cannabinoidPatterns = {
    'delta-8': [/\bdelta[\s-]*8\b/i, /\bd8\b/i],
    'delta-9': [/\bdelta[\s-]*9\b/i, /\bd9\b/i],
    'delta-10': [/\bdelta[\s-]*10\b/i, /\bd10\b/i],
    'thca': [/\bthc[\s-]*a\b/i],
    'thcp': [/\bthc[\s-]*p\b/i],
    'hhc': [/\bhhc\b/i],
    'cbd': [/\bcbd\b/i],
    'cbn': [/\bcbn\b/i],
    'thcv': [/\bthcv\b/i]
  };
  
  for (const [cannabinoid, patterns] of Object.entries(cannabinoidPatterns)) {
    if (patterns.some(pattern => pattern.test(messageLower))) {
      return cannabinoid;
    }
  }
  
  return null;
}

// NEW: Function to identify brands by product type for clarification
async function identifyBrandsForProductType(supabase, productType, requestId) {
  try {
    // First, try to find product type in the products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id, brands(id, name, logo_url)')
      .ilike('name', `%${productType}%`);
    
    if (productsError) {
      console.error('Error fetching products by type:', productsError);
      await logEvent(supabase, requestId, 'product_type_lookup_error', 'identify_brands_for_product_type', 
        'Failed to fetch products by type', { error: productsError.message, productType });
      return { brands: [], uniqueBrand: null, products: [] };
    }
    
    if (!products || products.length === 0) {
      // Try looking in product_ingredients for product type
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('product_ingredients')
        .select('product_id, product_type')
        .ilike('product_type', `%${productType}%`);
        
      if (ingredientsError || !ingredients || ingredients.length === 0) {
        await logEvent(supabase, requestId, 'product_type_lookup', 'identify_brands_for_product_type', 
          'No products found for product type', { productType });
        return { brands: [], uniqueBrand: null, products: [] };
      }
      
      // Get products by their IDs
      const productIds = ingredients.map(ing => ing.product_id).filter(id => id !== null);
      if (productIds.length === 0) {
        return { brands: [], uniqueBrand: null, products: [] };
      }
      
      const { data: typeProducts, error: typeProductsError } = await supabase
        .from('products')
        .select('id, name, brand_id, brands(id, name, logo_url)')
        .in('id', productIds);
        
      if (typeProductsError || !typeProducts || typeProducts.length === 0) {
        return { brands: [], uniqueBrand: null, products: [] };
      }
      
      // Extract unique brands
      const brandMap = new Map();
      typeProducts.forEach(product => {
        if (product.brands) {
          brandMap.set(product.brands.id, { 
            name: product.brands.name,
            logo: product.brands.logo_url
          });
        }
      });
      
      const brands = Array.from(brandMap.values()).map(b => b.name);
      const uniqueBrand = brands.length === 1 ? {
        name: brands[0],
        logo: Array.from(brandMap.values())[0].logo
      } : null;
      
      await logEvent(supabase, requestId, 'product_type_lookup', 'identify_brands_for_product_type', 
        `Found ${brands.length} brands for product type`, { 
          productType, 
          brands, 
          productCount: typeProducts.length 
      });
      
      return { 
        brands, 
        uniqueBrand, 
        products: typeProducts 
      };
    } else {
      // Extract unique brands from products
      const brandMap = new Map();
      products.forEach(product => {
        if (product.brands) {
          brandMap.set(product.brands.id, { 
            name: product.brands.name,
            logo: product.brands.logo_url
          });
        }
      });
      
      const brands = Array.from(brandMap.values()).map(b => b.name);
      const uniqueBrand = brands.length === 1 ? {
        name: brands[0],
        logo: Array.from(brandMap.values())[0].logo
      } : null;
      
      await logEvent(supabase, requestId, 'product_type_lookup', 'identify_brands_for_product_type', 
        `Found ${brands.length} brands for product type`, { 
          productType, 
          brands, 
          productCount: products.length 
      });
      
      return { 
        brands, 
        uniqueBrand, 
        products 
      };
    }
  } catch (error) {
    console.error('Error in identifyBrandsForProductType:', error);
    await logEvent(supabase, requestId, 'product_type_lookup_error', 'identify_brands_for_product_type', 
      'Exception in identifyBrandsForProductType', { error: error.message, productType });
    return { brands: [], uniqueBrand: null, products: [] };
  }
}

// NEW: Function to search for products containing a specific ingredient
async function findProductsWithIngredient(supabase, ingredient, requestId) {
  try {
    await logEvent(supabase, requestId, 'ingredient_search', 'find_products_with_ingredient', 
      `Searching for products with ingredient: ${ingredient}`);
    
    // Search through product_ingredients table for this ingredient
    const ingredientFields = ['ingredient1', 'ingredient2', 'ingredient3', 'ingredient4', 'ingredient5'];
    let query = supabase.from('product_ingredients').select('product_id, product_type');
    
    // Build OR condition for all ingredient fields
    let orConditions = [];
    ingredientFields.forEach(field => {
      orConditions.push(`${field}.ilike.%${ingredient}%`);
    });
    
    // Apply the OR conditions
    query = query.or(orConditions.join(','));
    
    const { data: ingredientMatches, error: ingredientError } = await query;
    
    if (ingredientError) {
      console.error('Error searching for ingredient:', ingredientError);
      await logEvent(supabase, requestId, 'ingredient_search_error', 'find_products_with_ingredient', 
        'Failed to search for ingredient', { error: ingredientError.message, ingredient });
      return { products: [], brands: [] };
    }
    
    if (!ingredientMatches || ingredientMatches.length === 0) {
      await logEvent(supabase, requestId, 'ingredient_search', 'find_products_with_ingredient', 
        `No products found with ingredient: ${ingredient}`);
      return { products: [], brands: [] };
    }
    
    // Get product IDs that contain this ingredient
    const productIds = ingredientMatches.map(match => match.product_id).filter(id => id !== null);
    
    if (productIds.length === 0) {
      return { products: [], brands: [] };
    }
    
    // Get full product details
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id, brands(id, name, logo_url)')
      .in('id', productIds);
      
    if (productsError || !products || products.length === 0) {
      await logEvent(supabase, requestId, 'ingredient_search', 'find_products_with_ingredient', 
        `Error or no products found with ingredient: ${ingredient}`, 
        { error: productsError?.message });
      return { products: [], brands: [] };
    }
    
    // Extract unique brands
    const brandMap = new Map();
    products.forEach(product => {
      if (product.brands) {
        brandMap.set(product.brands.id, product.brands.name);
      }
    });
    
    const brands = Array.from(brandMap.values());
    
    await logEvent(supabase, requestId, 'ingredient_search', 'find_products_with_ingredient', 
      `Found ${products.length} products and ${brands.length} brands with ingredient: ${ingredient}`);
    
    return { products, brands };
  } catch (error) {
    console.error('Error in findProductsWithIngredient:', error);
    await logEvent(supabase, requestId, 'ingredient_search_error', 'find_products_with_ingredient', 
      'Exception in findProductsWithIngredient', { error: error.message, ingredient });
    return { products: [], brands: [] };
  }
}

// Enhanced function to extract product or brand from a message with special handling for hemp brands
async function extractProductOrBrandFromMessage(supabase, message, requestId) {
  // Safety check to prevent errors if message is undefined or null
  if (!message) return null;
  
  const messageLower = message.toLowerCase();
  const productVariant = extractProductVariant(message);
  
  // Check for specific cannabinoid ingredient
  const cannabinoidIngredient = extractCannabinoidIngredient(message);
  if (cannabinoidIngredient) {
    await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
      `Identified cannabinoid ingredient: ${cannabinoidIngredient}`, 
      { cannabinoid: cannabinoidIngredient });
      
    // Check if this is a legality question about an ingredient
    if (isIngredientLegalityQuestion(message)) {
      // Find products containing this ingredient
      const { products, brands } = await findProductsWithIngredient(supabase, cannabinoidIngredient, requestId);
      
      if (products.length > 0) {
        return {
          ingredient: cannabinoidIngredient,
          ingredientProducts: products,
          ingredientBrands: brands,
          isIngredientQuery: true
        };
      } else {
        // Return ingredient info even if no products found
        return {
          ingredient: cannabinoidIngredient,
          isIngredientQuery: true
        };
      }
    }
  }
  
  // NEW: Handle common product type queries like "pouches" or "disposables"
  if (productVariant && ['pouches', 'disposable', 'gummies'].includes(productVariant)) {
    // Check if this product type maps to specific brands
    const brandInfo = await identifyBrandsForProductType(supabase, productVariant, requestId);
    
    if (brandInfo.uniqueBrand) {
      // If only one brand makes this product type, we can be specific
      await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
        `Mapped product type "${productVariant}" to unique brand: ${brandInfo.uniqueBrand.name}`, {
          productType: productVariant,
          brand: brandInfo.uniqueBrand.name
      });
      
      return {
        brand: brandInfo.uniqueBrand.name,
        variant: productVariant,
        fromProductType: true,
        brandLogo: brandInfo.uniqueBrand.logo
      };
    } else if (brandInfo.brands.length > 1) {
      // If multiple brands make this product type, we need clarification
      await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
        `Product type "${productVariant}" maps to multiple brands, needs clarification`, {
          productType: productVariant,
          brands: brandInfo.brands
      });
      
      return {
        productType: productVariant,
        needsClarification: true,
        possibleBrands: brandInfo.brands,
        variant: productVariant
      };
    }
  }
  
  try {
    // First, fetch common product names from the database to look for
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id, brands(name)')
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
    let identifiedBrand = null;
    
    for (const brand of hempBrands) {
      if (messageLower.includes(brand)) {
        await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
          `Identified hemp brand: ${brand}`, { category: 'HEMP', variant: productVariant });
        identifiedBrand = brand;
        break;
      }
    }
    
    // Return brand with variant information if found
    if (identifiedBrand) {
      return {
        brand: identifiedBrand,
        variant: productVariant
      };
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
    
    // If we found a brand match, return it with variant information if available
    if (brandMatch) {
      await logEvent(supabase, requestId, 'product_extraction', 'extract_product', 
        `Extracted brand: ${brandMatch}`, { variant: productVariant });
      return {
        brand: brandMatch,
        variant: productVariant
      };
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
        `Identified product category: ${productCategory}`, { variant: productVariant });
      // Return the general category as a fallback
      return {
        category: productCategory.toLowerCase(),
        variant: productVariant
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in product/brand extraction:', error);
    await logEvent(supabase, requestId, 'product_extraction_error', 'extract_product', 
      'Error in extractProductOrBrandFromMessage', { error: error.message });
    return null;
  }
}

// Get all ingredients for a product with comprehensive information
async function getAllProductIngredients(supabase, productId, requestId) {
  try {
    const { data: ingredients, error } = await supabase
      .from('product_ingredients')
      .select('*')
      .eq('product_id', productId);
      
    if (error) {
      console.error('Error fetching product ingredients:', error);
      await logEvent(supabase, requestId, 'ingredient_fetch_error', 'get_product_ingredients', 
        'Failed to fetch product ingredients', { productId, error: error.message });
      return null;
    }
    
    // Process ingredients to return a comprehensive list
    if (ingredients && ingredients.length > 0) {
      const allIngredients = [];
      
      // Extract all non-null ingredients from ingredient1-5 fields
      ingredients.forEach(record => {
        // Check each ingredient field and add non-empty ones
        if (record.ingredient1) allIngredients.push(record.ingredient1);
        if (record.ingredient2) allIngredients.push(record.ingredient2);
        if (record.ingredient3) allIngredients.push(record.ingredient3);
        if (record.ingredient4) allIngredients.push(record.ingredient4);
        if (record.ingredient5) allIngredients.push(record.ingredient5);
      });
      
      return {
        ingredients: allIngredients,
        product_type: ingredients[0].product_type || 'unknown'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAllProductIngredients:', error);
    await logEvent(supabase, requestId, 'ingredient_fetch_error', 'get_product_ingredients', 
      'Exception in getAllProductIngredients', { productId, error: error.message });
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

// NEW: Function to search for internet knowledge when database information is insufficient
async function getInternetKnowledge(supabase, query, requestId) {
  try {
    await logEvent(supabase, requestId, 'internet_knowledge_search', 'get_internet_knowledge', 
      `Searching for internet knowledge: ${query}`);
    
    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key is missing for internet knowledge search');
      return null;
    }
    
    // Call OpenAI API to get internet knowledge
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a knowledgeable assistant who provides accurate information about cannabinoid regulations in the United States. 
                      When answering about hemp-derived products like Delta-8, Delta-9, THCA, etc., provide recent and factual information about legality by state.
                      Focus on the specific state mentioned in the question.
                      Your response should include:
                      1. The legal status of the cannabinoid in the state
                      2. Any specific regulations or restrictions
                      3. Recent changes in legislation if relevant
                      4. Be clear if information might be outdated or uncertain
                      
                      Format your response in a clear, concise manner without unnecessary text.`
          },
          { 
            role: 'user', 
            content: query 
          }
        ],
        temperature: 0.3,  // Lower temperature for more factual responses
        max_tokens: 800
      })
    });
    
    const data = await response.json();
    
    if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid response from OpenAI for internet knowledge search:', data);
      return null;
    }
    
    await logEvent(supabase, requestId, 'internet_knowledge_received', 'get_internet_knowledge', 
      'Received internet knowledge response');
    
    return {
      knowledge: data.choices[0].message.content,
      source: 'gpt-knowledge'
    };
  } catch (error) {
    console.error('Error in getInternetKnowledge:', error);
    await logEvent(supabase, requestId, 'internet_knowledge_error', 'get_internet_knowledge', 
      'Exception in getInternetKnowledge', { error: error.message, query });
    return null;
  }
}

// Improved function to query the database for product legality in a state with enhanced ingredient analysis
async function checkProductLegality(supabase, stateName, productNameOrBrand, requestId) {
  try {
    await logEvent(supabase, requestId, 'legality_check_start', 'check_product_legality', 
      `Starting legality check for "${JSON.stringify(productNameOrBrand)}" in ${stateName}`);
    
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
    
    // Handle ingredient queries (like THCA, Delta-8)
    if (productNameOrBrand && typeof productNameOrBrand === 'object' && productNameOrBrand.isIngredientQuery) {
      const ingredient = productNameOrBrand.ingredient;
      
      await logEvent(supabase, requestId, 'ingredient_legality_check', 'check_product_legality', 
        `Checking legality for ingredient "${ingredient}" in ${stateName}`);
      
      // Check if we have products with this ingredient
      if (productNameOrBrand.ingredientProducts && productNameOrBrand.ingredientProducts.length > 0) {
        const products = productNameOrBrand.ingredientProducts;
        const productIds = products.map(p => p.id);
        
        // Get list of state's allowed products with this ingredient
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
          
        if (allowedError) {
          console.error('Error fetching allowed products with ingredient:', allowedError);
        }
        
        // Format products with this ingredient
        const legalProducts = (allowedProducts || []).map(ap => ({
          id: ap.products.id,
          name: ap.products.name,
          brand: ap.products.brands ? ap.products.brands.name : 'Unknown',
          brandLogo: ap.products.brands ? ap.products.brands.logo_url : null
        }));
        
        // Get all products from the database for this ingredient
        const allProductsWithIngredient = products.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brands ? p.brands.name : 'Unknown',
          brandLogo: p.brands ? p.brands.logo_url : null
        }));
        
        // Find illegal products (in our database but not allowed in this state)
        const illegalProducts = allProductsWithIngredient.filter(
          p => !legalProducts.some(lp => lp.id === p.id)
        );
        
        // Get brands that make products with this ingredient
        const brandsWithIngredient = [...new Set(
          allProductsWithIngredient.map(p => p.brand).filter(b => b !== 'Unknown')
        )];
        
        // Get knowledge from internet if no products found or as supplementary information
        let internetKnowledge = null;
        if (legalProducts.length === 0 || illegalProducts.length === 0) {
          internetKnowledge = await getInternetKnowledge(
            supabase, 
            `Is ${ingredient} legal in ${stateName}? Provide specific regulation information and recent updates.`, 
            requestId
          );
        }
        
        // If we have data from either database or internet, return it
        if (legalProducts.length > 0 || internetKnowledge) {
          return {
            found: true,
            legal: legalProducts.length > 0,
            state: stateName,
            ingredient: ingredient,
            legalProducts: legalProducts.length > 0 ? legalProducts : undefined,
            illegalProducts: illegalProducts.length > 0 ? illegalProducts : undefined,
            brandsWithIngredient: brandsWithIngredient,
            message: legalProducts.length > 0 
              ? `Products containing ${ingredient} are legal in ${stateName}.` 
              : `No products containing ${ingredient} were found to be legal in ${stateName}.`,
            internetKnowledge: internetKnowledge ? internetKnowledge.knowledge : undefined,
            source: legalProducts.length > 0 ? 'product_database' : (internetKnowledge ? 'internet_knowledge' : 'no_match'),
            date: new Date().toISOString().split('T')[0]
          };
        } else {
          // If no data found, return not found
          return {
            found: false,
            state: stateName,
            ingredient: ingredient,
            message: `No information found for ${ingredient} in ${stateName}.`,
            source: 'no_match',
            date: new Date().toISOString().split('T')[0]
          };
        }
      } else {
        // No products with this ingredient in our database, try internet knowledge
        const internetKnowledge = await getInternetKnowledge(
          supabase, 
          `Is ${ingredient} legal in ${stateName}? Provide specific regulation information and recent updates.`, 
          requestId
        );
        
        if (internetKnowledge) {
          return {
            found: true,
            state: stateName,
            ingredient: ingredient,
            message: `Information about ${ingredient} in ${stateName} based on general knowledge.`,
            internetKnowledge: internetKnowledge.knowledge,
            source: 'internet_knowledge',
            date: new Date().toISOString().split('T')[0]
          };
        } else {
          return {
            found: false,
            state: stateName,
            ingredient: ingredient,
            message: `No information found for ${ingredient} in ${stateName}.`,
            source: 'no_match',
            date: new Date().toISOString().split('T')[0]
          };
        }
      }
    }
    
    // NEW: Handle product type clarification cases
    if (productNameOrBrand && typeof productNameOrBrand === 'object' && productNameOrBrand.needsClarification) {
      return {
        found: true,
        needsClarification: true,
        state: stateName,
        productType: productNameOrBrand.productType,
        possibleBrands: productNameOrBrand.possibleBrands,
        message: `Multiple brands make ${productNameOrBrand.productType}. Please specify which brand you're inquiring about.`,
        source: 'multiple_brands',
        date: new Date().toISOString().split('T')[0]
      };
    }
    
    // Handle different types of product identification
    let brandName = null;
    let productVariant = null;
    let productCategory = null;
    let fromProductType = false;
    let brandLogo = null;
    
    // Extract brand and variant information
    if (typeof productNameOrBrand === 'object') {
      if (productNameOrBrand.brand) {
        brandName = productNameOrBrand.brand;
      }
      if (productNameOrBrand.variant) {
        productVariant = productNameOrBrand.variant;
      }
      if (productNameOrBrand.category) {
        productCategory = productNameOrBrand.category;
      }
      if (productNameOrBrand.fromProductType) {
        fromProductType = true;
      }
      if (productNameOrBrand.brandLogo) {
        brandLogo = productNameOrBrand.brandLogo;
      }
    } else if (typeof productNameOrBrand === 'string') {
      brandName = productNameOrBrand;
    }
    
    // Special handling for hemp product brands (Galaxy Treats, MCRO)
    const isHempBrand = brandName && ['galaxy treats', 'mcro'].some(brand => 
      brandName.toLowerCase().includes(brand)
    );
    
    // Log what we're searching for clarity
    await logEvent(supabase, requestId, 'legality_check_params', 'check_product_legality', 
      `Legality check parameters`, { 
        stateName, 
        stateId, 
        brandName, 
        productVariant,
        isHempBrand,
        fromProductType
      });
    
    // If we have a brand name, look for that brand's products
    if (brandName) {
      // Find the brand ID
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name, logo_url')
        .ilike('name', `%${brandName}%`)
        .limit(5);
      
      if (brandError || !brandData || brandData.length === 0) {
        // Try internet knowledge as fallback for known brands that might not be in our database
        if (isHempBrand) {
          const internetKnowledge = await getInternetKnowledge(
            supabase, 
            `Is ${brandName} ${productVariant || ''} legal in ${stateName}? Provide specific regulation information.`, 
            requestId
          );
          
          if (internetKnowledge) {
            return {
              found: true,
              state: stateName,
              brand: brandName,
              variant: productVariant,
              message: `Information about ${brandName} ${productVariant || ''} in ${stateName} based on general knowledge.`,
              internetKnowledge: internetKnowledge.knowledge,
              source: 'internet_knowledge',
              category: 'HEMP',
              date: new Date().toISOString().split('T')[0]
            };
          }
        }
        
        return {
          found: false,
          state: stateName,
          message: `Brand "${brandName}" not found in database.`,
          source: 'no_match',
          date: new Date().toISOString().split('T')[0]
        };
      }
      
      // If fromProductType is true, add context about how we identified the brand
      let productTypeContext = '';
      if (fromProductType && productVariant) {
        productTypeContext = ` We identified Juice Head as the maker of ${productVariant}.`;
      }
      
      // Get all products for this brand
      const brandIds = brandData.map(b => b.id);
      
      let productQuery = supabase
        .from('products')
        .select('id, name, brand_id, brands(name, logo_url)')
        .in('brand_id', brandIds);
        
      // Filter by product variant if specified
      if (productVariant) {
        productQuery = productQuery.ilike('name', `%${productVariant}%`);
      }
      
      const { data: brandProducts, error: bpError } = await productQuery.order('name');
      
      if (bpError || !brandProducts || brandProducts.length === 0) {
        // Try internet knowledge as fallback for brand products
        if (isHempBrand) {
          const internetKnowledge = await getInternetKnowledge(
            supabase, 
            `Is ${brandName} ${productVariant || ''} legal in ${stateName}? Provide specific regulation information.`, 
            requestId
          );
          
          if (internetKnowledge) {
            return {
              found: true,
              legal: false,
              state: stateName,
              brand: brandData[0].name,
              brandLogo: brandData[0].logo_url || brandLogo,
              message: `No products found in database for brand "${brandData[0].name}"${productVariant ? ` matching "${productVariant}"` : ''}.`,
              internetKnowledge: internetKnowledge.knowledge,
              source: 'internet_knowledge',
              category: isHempBrand ? 'HEMP' : identifyProductCategory(brandName) || 'Unknown',
              date: new Date().toISOString().split('T')[0],
              isHempBrand: isHempBrand,
              fromProductType: fromProductType
            };
          }
        }
        
        return {
          found: true,
          legal: false,
          state: stateName,
          brand: brandData[0].name,
          brandLogo: brandData[0].logo_url || brandLogo,
          message: `No products found for brand "${brandData[0].name}"${productVariant ? ` matching "${productVariant}"` : ''}.${productTypeContext}`,
          source: 'brand_database',
          date: new Date().toISOString().split('T')[0],
          isHempBrand: isHempBrand,
          fromProductType: fromProductType
        };
      }
      
      // Now check which of these products are allowed in this state
      const productIds = brandProducts.map(p => p.id);
      
      // Get list of state's allowed products with detailed product information
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
        .in('product_id', productIds)
        .order('products(name)');
      
      // Get ingredients for all products of this brand
      const productIngredientsMap = {};
      const allBrandProductsWithIngredients = [];
      
      for (const product of brandProducts) {
        const ingredientInfo = await getAllProductIngredients(supabase, product.id, requestId);
        
        if (ingredientInfo) {
          productIngredientsMap[product.id] = ingredientInfo;
          
          allBrandProductsWithIngredients.push({
            id: product.id,
            name: product.name,
            type: ingredientInfo.product_type || 'Unknown',
            ingredients: ingredientInfo.ingredients || [],
            brand: product.brands?.name || brandData[0].name,
            brandLogo: product.brands?.logo_url || brandData[0].logo_url || brandLogo
          });
        } else {
          // Include product even without ingredients
          allBrandProductsWithIngredients.push({
            id: product.id,
            name: product.name,
            type: 'Unknown',
            ingredients: [],
            brand: product.brands?.name || brandData[0].name,
            brandLogo: product.brands?.logo_url || brandData[0].logo_url || brandLogo
          });
        }
      }
      
      // Get list of all products that are allowed in this state
      const { data: allStateProducts, error: allStateError } = await supabase
        .from('state_allowed_products')
        .select(`
          product_id
        `)
        .eq('state_id', stateId);
      
      const allowedProductIds = allStateProducts?.map(p => p.product_id) || [];
      
      // Check each product to see if it's allowed
      const legalProducts = [];
      const illegalProducts = [];
      
      for (const product of allBrandProductsWithIngredients) {
        if (allowedProductIds.includes(product.id)) {
          legalProducts.push(product);
        } else {
          illegalProducts.push(product);
        }
      }
      
      // Add context about how we derived the brand from product type if relevant
      let derivedFromContext = '';
      if (fromProductType && productVariant) {
        derivedFromContext = `\n\nNote: ${brandData[0].name} was identified as the primary manufacturer of ${productVariant} based on our database.`;
      }
      
      // For hemp brands, try to get additional internet knowledge
      let internetKnowledge = null;
      if (isHempBrand) {
        internetKnowledge = await getInternetKnowledge(
          supabase, 
          `Is ${brandData[0].name} ${productVariant || ''} legal in ${stateName}? Provide specific regulation information.`, 
          requestId
        );
      }
      
      // Process results based on what we found
      if (legalProducts.length > 0) {
        // Format the product names as a list
        const legalProductNames = legalProducts.map(p => p.name).join(', ');
        
        // Collect all ingredients from legal products
        const allLegalIngredients = new Set();
        legalProducts.forEach(product => {
          if (product.ingredients && product.ingredients.length > 0) {
            product.ingredients.forEach(ingredient => {
              allLegalIngredients.add(ingredient);
            });
          }
        });
        
        return {
          found: true,
          legal: true,
          state: stateName,
          brand: brandData[0].name,
          brandLogo: brandData[0].logo_url || brandLogo,
          legalProducts: legalProducts,
          illegalProducts: illegalProducts.length > 0 ? illegalProducts : undefined,
          allIngredients: Array.from(allLegalIngredients),
          message: `The following products from ${brandData[0].name} are legal in ${stateName}: ${legalProductNames}.${derivedFromContext}`,
          internetKnowledge: internetKnowledge ? internetKnowledge.knowledge : undefined,
          category: isHempBrand ? 'HEMP' : identifyProductCategory(brandName) || 'Unknown',
          source: 'brand_database',
          date: new Date().toISOString().split('T')[0],
          fromProductType: fromProductType
        };
      } else {
        return {
          found: true,
          legal: false,
          state: stateName,
          brand: brandData[0].name,
          brandLogo: brandData[0].logo_url || brandLogo,
          illegalProducts: illegalProducts,
          message: `No products from ${brandData[0].name}${productVariant ? ` matching "${productVariant}"` : ''} are legal in ${stateName}.${derivedFromContext}`,
          internetKnowledge: internetKnowledge ? internetKnowledge.knowledge : undefined,
          category: isHempBrand ? 'HEMP' : identifyProductCategory(brandName) || 'Unknown',
          source: 'brand_database',
          date: new Date().toISOString().split('T')[0],
          fromProductType: fromProductType
        };
      }
    }
    
    // General case for non-brand specific queries
    // Check for direct product matches
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, name, brand_id, brands(name, logo_url)')
      .ilike('name', `%${productNameOrBrand}%`)
      .order('name');
    
    if (productError || !productData || productData.length === 0) {
      // Try extracting a cannabinoid ingredient as fallback
      const cannabinoidIngredient = extractCannabinoidIngredient(productNameOrBrand);
      if (cannabinoidIngredient) {
        // Find products containing this ingredient
        const { products, brands } = await findProductsWithIngredient(supabase, cannabinoidIngredient, requestId);
        
        if (products.length > 0) {
          // Handle same as ingredient query
          const productIds = products.map(p => p.id);
          
          // Get list of state's allowed products with this ingredient
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
            
          // Format products with this ingredient
          const legalProducts = (allowedProducts || []).map(ap => ({
            id: ap.products.id,
            name: ap.products.name,
            brand: ap.products.brands ? ap.products.brands.name : 'Unknown',
            brandLogo: ap.products.brands ? ap.products.brands.logo_url : null
          }));
          
          // Get internet knowledge
          const internetKnowledge = await getInternetKnowledge(
            supabase, 
            `Is ${cannabinoidIngredient} legal in ${stateName}? Provide specific regulation information.`, 
            requestId
          );
          
          return {
            found: true,
            legal: legalProducts.length > 0,
            state: stateName,
            ingredient: cannabinoidIngredient,
            legalProducts: legalProducts.length > 0 ? legalProducts : undefined,
            message: legalProducts.length > 0 
              ? `Products containing ${cannabinoidIngredient} are legal in ${stateName}.` 
              : `No products containing ${cannabinoidIngredient} were found to be legal in ${stateName}.`,
            internetKnowledge: internetKnowledge ? internetKnowledge.knowledge : undefined,
            source: legalProducts.length > 0 ? 'product_database' : 'internet_knowledge',
            date: new Date().toISOString().split('T')[0]
          };
        } else {
          // No products with this ingredient, try internet knowledge
          const internetKnowledge = await getInternetKnowledge(
            supabase, 
            `Is ${cannabinoidIngredient} legal in ${stateName}? Provide specific regulation information.`, 
            requestId
          );
          
          if (internetKnowledge) {
            return {
              found: true,
              state: stateName,
              ingredient: cannabinoidIngredient,
              message: `Information about ${cannabinoidIngredient} in ${stateName} based on general knowledge.`,
              internetKnowledge: internetKnowledge.knowledge,
              source: 'internet_knowledge',
              date: new Date().toISOString().split('T')[0]
            };
          }
        }
      }
      
      return {
        found: false,
        state: stateName,
        message: `No information found for "${JSON.stringify(productNameOrBrand)}" in ${stateName}.`,
        source: 'no_match',
        date: new Date().toISOString().split('T')[0]
      };
    }
    
    // Get allowed products for the found products
    const productIds = productData.map(p => p.id);
    
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
    
    if (allowedError) {
      console.error('Error fetching allowed products:', allowedError);
      return {
        found: false,
        state: stateName,
        message: `Error fetching allowed products for "${JSON.stringify(productNameOrBrand)}" in ${stateName}.`,
        source: 'database_error',
        date: new Date().toISOString().split('T')[0]
      };
    }
    
    const legalProducts = allowedProducts.map(ap => ({
      id: ap.products.id,
      name: ap.products.name,
      type: 'Unknown', // Since we don't have product_type in the products table
      brand: ap.products.brands ? ap.products.brands.name : 'Unknown',
      brandLogo: ap.products.brands ? ap.products.brands.logo_url : null,
    }));
    
    if (legalProducts.length > 0) {
      // Format the product names as a list
      const legalProductNames = legalProducts.map(p => p.name).join(', ');
      
      return {
        found: true,
        legal: true,
        state: stateName,
        products: legalProducts,
        message: `The following products are legal in ${stateName}: ${legalProductNames}.`,
        source: 'product_database',
        date: new Date().toISOString().split('T')[0]
      };
    } else {
      return {
        found: true,
        legal: false,
        state: stateName,
        message: `No products from "${JSON.stringify(productNameOrBrand)}" are legal in ${stateName}.`,
        source: 'product_database',
        date: new Date().toISOString().split('T')[0]
      };
    }
    
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
    
    // Special mode for health check
    if (reqJson && reqJson.mode === "health_check") {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle both possible parameter names (message or content)
    const userMessage = reqJson.content || reqJson.message;
    const { chatId, messages: chatHistory = [], requestId = crypto.randomUUID(), useSimpleFormat = false } = reqJson;
    
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
    
    try {
      await logEvent(supabase, requestId, 'chat_request_received', 'chat_function', 'Chat request received', {
        chatId,
        hasHistory: chatHistory && chatHistory.length > 0,
        message: userMessage.substring(0, 100) // Log first 100 chars of message
      });
    } catch (logError) {
      console.error('Error logging chat request:', logError);
      // Continue execution even if logging fails
    }
    
    // Check if the message is asking about product legality
    let productLegalityData = null;
    
    try {
      // Check for ingredient legality question first (new feature)
      const cannabinoidIngredient = extractCannabinoidIngredient(userMessage);
      const stateName = extractStateFromMessage(userMessage);
      
      if (cannabinoidIngredient && stateName && isIngredientLegalityQuestion(userMessage)) {
        await logEvent(supabase, requestId, 'ingredient_legality_check', 'chat_function', 
          `Checking legality for ingredient "${cannabinoidIngredient}" in "${stateName}"`);
        
        // Create a query object with isIngredientQuery flag
        const ingredientQuery = {
          ingredient: cannabinoidIngredient,
          isIngredientQuery: true
        };
        
        // Find products with this ingredient
        const { products, brands } = await findProductsWithIngredient(supabase, cannabinoidIngredient, requestId);
        
        if (products.length > 0) {
          ingredientQuery.ingredientProducts = products;
          ingredientQuery.ingredientBrands = brands;
        }
        
        // Query the database for this ingredient-state combination
        productLegalityData = await checkProductLegality(supabase, stateName, ingredientQuery, requestId);
        
        await logEvent(supabase, requestId, 'ingredient_legality_result', 'chat_function', 
          'Ingredient legality check completed', productLegalityData);
      }
      // If not an ingredient query, check if it's a product legality question
      else if (isProductLegalityQuestion(userMessage)) {
        const stateName = extractStateFromMessage(userMessage);
        const productOrBrand = await extractProductOrBrandFromMessage(supabase, userMessage, requestId);
        
        if (stateName && productOrBrand) {
          await logEvent(supabase, requestId, 'product_legality_check', 'chat_function', 
            `Checking legality for "${JSON.stringify(productOrBrand)}" in "${stateName}"`, {
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
      await logEvent(supabase, requestId, 'product_legality_error', 'chat_function', 
        'Error checking product legality', { error: legalityCheckError.message });
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
- If useSimpleFormat is true, provide a simple, direct answer without a LEGAL STATUS header or structured format
- Otherwise, begin with a clear "LEGAL STATUS: [LEGAL/NOT LEGAL] in [STATE]" heading
- List the brand, products, and primary ingredients in a structured format
- Be definitive when database information is available
- ALWAYS list each specific legal product by exact name
- Include brand information when available
- Do not speculate on legal status when database information is missing
- When ingredient information is available, use it to provide additional context about why certain products may or may not be legal in specific states
- Always include the date of the information when available
- If internet knowledge is available, clearly indicate that it's supplemental information by saying "Based on general regulatory information:" before presenting it

When dealing with hemp products (especially Galaxy Treats and MCRO brands):
- Distinguish clearly between different cannabinoid variants (Delta-8, Delta-9, Delta-10, etc.)
- Acknowledge that different variants may have different legal statuses in the same state
- Present each product variant with its specific legal status
- Explain that some states have specific regulations for different hemp-derived cannabinoids

VERY IMPORTANT: The company primarily works with:
1. Nicotine products: especially pouches, vapes, disposables, and other nicotine delivery systems
2. Hemp products: Galaxy Treats and MCRO are hemp product brands that include both disposables and edibles with various cannabinoids (Delta-8, Delta-9, Delta-10, etc.)

When users ask about products like "pouches", assume they are referring to NICOTINE pouches (like tobacco-free nicotine pouches) unless explicitly stated otherwise.

Key product categories:
- Pouches: These are nicotine pouches, placed in the mouth (examples: ZYN, VELO, etc.)
- Disposables: These are disposable vape devices (examples: Elf Bar, Hyde, Galaxy Treats, MCRO, etc.)
- Vapes/E-cigarettes: Electronic nicotine delivery devices
- E-liquids: Liquid nicotine for refillable vape devices
- Hemp products: Products containing hemp-derived cannabinoids (Delta-9, Delta-8, THCP, etc.) including both edibles and disposables

IMPORTANT ABOUT PRODUCT TYPES:
- When a user asks about a generic product type like "pouches" without specifying a brand, assume they're asking about Juice Head pouches, as this is the only brand that makes pouches according to our database.
- If the user asks about "disposables" without specifying a brand, ask for clarification since multiple brands make disposables.

FORMAT FOR PRODUCT LEGALITY RESPONSES:

If useSimpleFormat is TRUE:
Use a simple, direct format without headers or structured sections:
\`\`\`
[Brand name] [product type] are [legal/not legal] in [state]. [Additional details in 1-2 sentences]
\`\`\`

If useSimpleFormat is FALSE or not specified:
Use this structured format:
\`\`\`
**LEGAL STATUS: [LEGAL/NOT LEGAL] in [STATE]**

Brand: [Brand Name]
Products: [List each product individually by exact name]
Primary Ingredients: [Main Ingredients]

---

[Detailed explanation of ingredient regulations in this state]
[Any relevant regulatory context about why these ingredients are regulated]
\`\`\`

When clarification is needed:
If a user asks about a product type that could be made by multiple brands (like "disposables"), ask which specific brand they're referring to before providing an answer. For example: "Multiple brands make disposables. Are you asking about Galaxy Treats disposables, MCRO disposables, or another brand?"

Always cite your sources where appropriate (e.g., 'According to our State Map database from [DATE]...' or 'Based on the Knowledge Base...').

Answer in a professional, clear, and helpful tone. If you cannot find an answer from the available sources, politely let the user know and suggest submitting a request via the Marketing Request Form or contacting the appropriate department.`;

    // If we have product legality data, append it to the system prompt
    if (productLegalityData) {
      // Check if clarification is needed
      if (productLegalityData.needsClarification) {
        baseSystemPrompt += `\n\nIMPORTANT: I've identified that the user is asking about ${productLegalityData.productType}, but multiple brands make this product type:
${JSON.stringify(productLegalityData.possibleBrands, null, 2)}

You should ask the user to clarify which brand they're referring to. For example: "I see you're asking about ${productLegalityData.productType}. Could you please clarify which brand you're interested in? Our database shows that ${productLegalityData.possibleBrands.join(', ')} all make ${productLegalityData.productType} products."

DO NOT provide specific legality information until the brand is clarified.`;
      } else {
        baseSystemPrompt += `\n\nIMPORTANT: I've queried our product legality database and found the following information about the user's question:
${JSON.stringify(productLegalityData, null, 2)}

Use this information to answer the current question. This data comes directly from our regulatory database and should be considered the final authority on product legality by state. When responding:
- If useSimpleFormat is true (${useSimpleFormat}), provide a simple, direct answer without the LEGAL STATUS header or structured format
- If specific products were found, clearly state their legal status
- Present the information using the format specified above
- For hemp products (especially Galaxy Treats and MCRO), explain the specific variant mentioned (Delta-8, Delta-9, etc.) and its legal status in the specified state
- Use the ingredient information to explain WHY certain products are regulated differently by state
- Always include the date of the database information when available
- If internetKnowledge is available, include it as supplementary information`;

        // If fromProductType is true, add special handling instructions
        if (productLegalityData.fromProductType) {
          baseSystemPrompt += `\n\nNOTE: The user asked about a generic product type (${productLegalityData.brand} ${productLegalityData.variant || 'products'}), and our database identified ${productLegalityData.brand} as the primary manufacturer of this product type. If useSimpleFormat is false, make sure to acknowledge this in your response, e.g., "I see you're asking about ${productLegalityData.variant || 'products'} in ${productLegalityData.state}. According to our database, ${productLegalityData.brand} is the primary brand that makes these products."`;
        }
        
        // If this is an ingredient query, add special handling
        if (productLegalityData.ingredient) {
          baseSystemPrompt += `\n\nNOTE: The user asked about the cannabinoid "${productLegalityData.ingredient}" which is an ingredient, not a specific product. Focus your response on the legality of products containing this ingredient.
          
If internetKnowledge is available, clearly separate database information from general knowledge by introducing it with "Based on general regulatory information:" and then presenting the internetKnowledge.`;
        }
      }
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
