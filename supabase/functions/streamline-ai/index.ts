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
      userMessage = requestBody.message;
    } else if (requestBody.messages && Array.isArray(requestBody.messages)) {
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
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enhanced query analysis with intelligent intent detection
    const queryAnalysis = await analyzeQueryWithEnhancedIntelligence(userMessage, supabase);
    console.log('Enhanced query analysis:', queryAnalysis);

    let contextData = [];
    let searchParams = {};

    // Intelligent source routing with priority system
    const sourceStrategy = determineSourceStrategy(queryAnalysis);
    console.log('Source strategy:', sourceStrategy);

    // Execute multi-source data gathering with intelligent prioritization
    for (const source of sourceStrategy.sources) {
      console.log(`Querying ${source.name} with priority ${source.priority}...`);
      
      try {
        let sourceData = [];
        
        switch (source.name) {
          case 'state_map':
            sourceData = await queryStateMapEnhanced(supabase, {
              ...queryAnalysis,
              query: userMessage
            });
            break;
          case 'drive_files':
            sourceData = await queryDriveFilesEnhanced(supabase, {
              query: userMessage,
              fileType: queryAnalysis.fileType,
              brand: queryAnalysis.brand,
              category: queryAnalysis.category
            });
            break;
          case 'knowledge_base':
            sourceData = await queryKnowledgeBaseEnhanced(supabase, {
              query: userMessage,
              tags: queryAnalysis.tags
            });
            break;
          case 'state_excise_taxes':
            sourceData = await queryStateExciseTaxes(supabase, {
              state: queryAnalysis.state,
              query: userMessage
            });
            break;
          case 'firecrawl_legal':
            if (queryAnalysis.requiresLegalAnalysis && firecrawlApiKey) {
              sourceData = await queryFirecrawlLegalSources(firecrawlApiKey, queryAnalysis);
            }
            break;
        }
        
        console.log(`${source.name} returned ${sourceData.length} results`);
        
        if (sourceData.length > 0) {
          contextData.push(...sourceData.map(item => ({
            ...item,
            source: source.name,
            priority: source.priority
          })));
        }
      } catch (error) {
        console.error(`Error querying ${source.name}:`, error);
      }
    }

    // Sort context data by priority and relevance
    contextData = contextData.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    console.log('Total context data items:', contextData.length);

    // Generate enhanced AI response with legal reasoning
    const aiResponse = await generateEnhancedAIResponse(
      openaiApiKey, 
      userMessage, 
      contextData, 
      queryAnalysis,
      requestBody.userId || 'anonymous'
    );
    
    return new Response(JSON.stringify({ 
      response: aiResponse,
      sources: contextData.map(item => ({
        type: item.source,
        title: item.title || item.file_name || 'Document',
        content: item.content || item.summary || 'Content not available',
        priority: item.priority || 0
      })),
      analysis: queryAnalysis
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in enhanced streamline-ai function:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred processing your request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeQueryWithEnhancedIntelligence(query: string, supabase: any) {
  if (!query || typeof query !== 'string') {
    console.error('Invalid query provided to analyzeQuery:', query);
    return {
      isProductLegality: false,
      isFileSearch: false,
      requiresLegalAnalysis: false,
      product: null,
      brand: null,
      state: null,
      isListQuery: false,
      fileType: null,
      category: null,
      tags: [],
      legalComplexity: 'basic',
      intentType: 'general'
    };
  }

  const lowerQuery = query.toLowerCase();
  
  // Enhanced legal analysis detection
  const legalKeywords = ['legal', 'legality', 'allowed', 'permitted', 'banned', 'prohibited', 'can i', 'available', 'compliance', 'regulation', 'law', 'ruling', 'enforcement', 'court', 'legislation'];
  const complexLegalKeywords = ['why', 'explain', 'ruling', 'court', 'enforcement', 'bulletin', 'legislation', 'recent', 'updated', 'changed'];
  
  const hasLegalKeyword = legalKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasComplexLegalKeyword = complexLegalKeywords.some(keyword => lowerQuery.includes(keyword));
  const requiresLegalAnalysis = hasLegalKeyword && (hasComplexLegalKeyword || lowerQuery.includes('why'));
  
  // Enhanced file search detection
  const fileKeywords = ['logo', 'document', 'file', 'sheet', 'sales sheet', 'find me', 'download', 'pdf', 'image', 'picture', 'brochure', 'flyer', 'pos kit', 'marketing material'];
  const hasFileKeyword = fileKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // File type detection
  let detectedFileType = null;
  const fileTypePatterns = [
    { pattern: /pos kit/i, type: 'pos kit' },
    { pattern: /sales sheet/i, type: 'sales sheet' },
    { pattern: /logo/i, type: 'logo' },
    { pattern: /document/i, type: 'document' },
    { pattern: /pdf/i, type: 'pdf' },
    { pattern: /image/i, type: 'image' },
    { pattern: /picture/i, type: 'image' },
    { pattern: /brochure/i, type: 'brochure' },
    { pattern: /flyer/i, type: 'flyer' },
    { pattern: /marketing material/i, type: 'marketing' }
  ];
  
  for (const fileType of fileTypePatterns) {
    if (fileType.pattern.test(lowerQuery)) {
      detectedFileType = fileType.type;
      break;
    }
  }
  
  // Enhanced state detection
  let detectedState = null;
  try {
    const { data: states, error } = await supabase
      .from('states')
      .select('name');
    
    if (!error && states) {
      for (const state of states) {
        const statePattern = new RegExp(`\\b${state.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (statePattern.test(lowerQuery)) {
          detectedState = state.name;
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching states:', error);
  }
  
  // Enhanced brand detection
  let detectedBrand = null;
  try {
    const { data: brands, error } = await supabase
      .from('brands')
      .select('name');
    
    if (!error && brands) {
      for (const brand of brands) {
        const brandPattern = new RegExp(`\\b${brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (brandPattern.test(lowerQuery)) {
          detectedBrand = brand.name;
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching brands:', error);
  }
  
  // Enhanced product detection
  let detectedProduct = null;
  const productMatches = [
    { pattern: /juice head pouches?/i, name: 'Pouches' },
    { pattern: /5k disposables?/i, name: '5K Disposable' },
    { pattern: /galaxy treats disposables?/i, name: 'Disposable' },
    { pattern: /disposables?/i, name: 'Disposable' },
    { pattern: /pouches?/i, name: 'Pouches' },
    { pattern: /gummies/i, name: 'Gummies' },
    { pattern: /pre-?rolls?/i, name: 'Pre-Roll' },
    { pattern: /vapes?/i, name: 'Vape' },
    { pattern: /carts?/i, name: 'Cart' },
    { pattern: /edibles?/i, name: 'Edible' },
    { pattern: /kratom/i, name: 'Kratom' },
    { pattern: /alcohol armor/i, name: 'Alcohol Armor' }
  ];
  
  for (const productMatch of productMatches) {
    if (productMatch.pattern.test(lowerQuery)) {
      detectedProduct = productMatch.name;
      break;
    }
  }
  
  // List query detection
  const listKeywords = ['which', 'what', 'list', 'all', 'what are', 'show me'];
  const isListQuery = listKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Intent type classification
  let intentType = 'general';
  if (hasFileKeyword) intentType = 'file_search';
  else if (hasLegalKeyword) intentType = 'legal_inquiry';
  else if (isListQuery) intentType = 'list_request';
  
  // Legal complexity assessment
  let legalComplexity = 'basic';
  if (requiresLegalAnalysis) legalComplexity = 'complex';
  else if (hasLegalKeyword) legalComplexity = 'moderate';
  
  // Category detection for files
  let detectedCategory = null;
  if (detectedFileType === 'logo') detectedCategory = 'Logos';
  else if (detectedFileType === 'sales sheet') detectedCategory = 'Sales Sheets';
  else if (detectedFileType === 'pos kit') detectedCategory = 'POS Kits';
  
  // Tag extraction for knowledge base
  const tags = [];
  if (detectedBrand) tags.push(detectedBrand.toLowerCase());
  if (detectedProduct) tags.push(detectedProduct.toLowerCase());
  if (detectedState) tags.push(detectedState.toLowerCase());
  if (hasLegalKeyword) tags.push('legal');
  if (requiresLegalAnalysis) tags.push('compliance');
  
  return {
    isProductLegality: hasLegalKeyword && (detectedProduct || detectedBrand || detectedState),
    isFileSearch: hasFileKeyword,
    requiresLegalAnalysis,
    product: detectedProduct,
    brand: detectedBrand,
    state: detectedState,
    isListQuery,
    fileType: detectedFileType,
    category: detectedCategory,
    tags,
    legalComplexity,
    intentType
  };
}

function determineSourceStrategy(queryAnalysis: any) {
  const sources = [];
  
  // Priority-based source selection
  if (queryAnalysis.isFileSearch) {
    sources.push({ name: 'drive_files', priority: 10 });
    sources.push({ name: 'knowledge_base', priority: 7 });
  }
  
  if (queryAnalysis.isProductLegality) {
    sources.push({ name: 'state_map', priority: 10 });
    if (queryAnalysis.state) {
      sources.push({ name: 'state_excise_taxes', priority: 8 });
    }
    if (queryAnalysis.requiresLegalAnalysis) {
      sources.push({ name: 'firecrawl_legal', priority: 9 });
    }
    sources.push({ name: 'knowledge_base', priority: 6 });
  }
  
  if (queryAnalysis.intentType === 'general' || sources.length === 0) {
    sources.push({ name: 'knowledge_base', priority: 8 });
    sources.push({ name: 'drive_files', priority: 6 });
    if (queryAnalysis.state) {
      sources.push({ name: 'state_map', priority: 7 });
    }
  }
  
  // Remove duplicates and sort by priority
  const uniqueSources = sources.filter((source, index, self) => 
    index === self.findIndex(s => s.name === source.name)
  ).sort((a, b) => b.priority - a.priority);
  
  return {
    sources: uniqueSources,
    strategy: queryAnalysis.requiresLegalAnalysis ? 'comprehensive_legal' : 'standard'
  };
}

async function queryStateMapEnhanced(supabase: any, params: any) {
  // ... keep existing code (queryStateMap function) the same ...
  return await queryStateMap(supabase, params);
}

async function queryStateMap(supabase: any, params: any) {
  try {
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

async function queryStateExciseTaxes(supabase: any, params: any) {
  try {
    const { state, query } = params;
    
    if (!state) {
      console.log('No state provided for excise tax query');
      return [];
    }

    console.log(`Querying excise taxes for state: ${state}`);

    // Find the state ID
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id, name')
      .ilike('name', `%${state}%`)
      .limit(1);

    if (stateError || !stateData || stateData.length === 0) {
      console.log('State not found for excise tax query');
      return [];
    }

    const foundState = stateData[0];

    // Query excise tax information
    const { data: exciseTaxData, error: exciseTaxError } = await supabase
      .from('state_excise_taxes')
      .select('*')
      .eq('state_id', foundState.id);

    if (exciseTaxError) {
      console.error('Error querying excise taxes:', exciseTaxError);
      return [];
    }

    if (!exciseTaxData || exciseTaxData.length === 0) {
      return [{
        title: `No Excise Tax Information for ${foundState.name}`,
        content: `No excise tax information is currently available for ${foundState.name}. Please contact compliance for the latest tax requirements.`,
        state: foundState.name,
        source: 'state_excise_taxes'
      }];
    }

    const exciseTaxInfo = exciseTaxData[0];
    return [{
      title: `Excise Tax Information for ${foundState.name}`,
      content: exciseTaxInfo.excise_tax_info || `Excise tax information is available for ${foundState.name} but content is not accessible.`,
      state: foundState.name,
      lastUpdated: exciseTaxInfo.updated_at,
      source: 'state_excise_taxes'
    }];

  } catch (error) {
    console.error('Error in queryStateExciseTaxes:', error);
    return [];
  }
}

async function queryFirecrawlLegalSources(firecrawlApiKey: string, queryAnalysis: any) {
  try {
    console.log('Initiating Firecrawl legal source crawling');

    const { state, product, brand } = queryAnalysis;
    
    // Build targeted government URLs for crawling
    const govUrls = [];
    
    if (state) {
      // State-specific government sites
      const stateCode = getStateCode(state);
      if (stateCode) {
        govUrls.push(`https://www.${stateCode.toLowerCase()}.gov`);
        govUrls.push(`https://${stateCode.toLowerCase()}.gov`);
      }
    }
    
    // Federal sources for hemp/cannabis regulations
    if (product && (product.toLowerCase().includes('hemp') || product.toLowerCase().includes('cbd') || product.toLowerCase().includes('thc'))) {
      govUrls.push('https://www.fda.gov');
      govUrls.push('https://www.usda.gov');
    }

    if (govUrls.length === 0) {
      console.log('No relevant government URLs identified for crawling');
      return [];
    }

    const results = [];
    
    for (const url of govUrls.slice(0, 2)) { // Limit to 2 URLs to avoid rate limits
      try {
        console.log(`Crawling government source: ${url}`);
        
        const crawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            formats: ['markdown'],
            onlyMainContent: true,
            limit: 1
          }),
        });

        if (!crawlResponse.ok) {
          console.error(`Firecrawl API error for ${url}:`, crawlResponse.status);
          continue;
        }

        const crawlData = await crawlResponse.json();
        
        if (crawlData.success && crawlData.data) {
          console.log(`Successfully crawled ${url}`);
          
          // Extract relevant content based on query
          const content = crawlData.data.markdown || crawlData.data.content || '';
          const relevantContent = extractRelevantLegalContent(content, queryAnalysis);
          
          if (relevantContent) {
            results.push({
              title: `Government Source: ${url}`,
              content: relevantContent,
              url: url,
              source: 'firecrawl_legal',
              crawledAt: new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
      }
    }

    console.log(`Firecrawl returned ${results.length} legal sources`);
    return results;

  } catch (error) {
    console.error('Error in queryFirecrawlLegalSources:', error);
    return [];
  }
}

function getStateCode(stateName: string): string | null {
  const stateCodes: { [key: string]: string } = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };
  
  return stateCodes[stateName] || null;
}

function extractRelevantLegalContent(content: string, queryAnalysis: any): string | null {
  const { product, brand, state } = queryAnalysis;
  const keywords = [];
  
  if (product) keywords.push(product.toLowerCase());
  if (brand) keywords.push(brand.toLowerCase());
  if (state) keywords.push(state.toLowerCase());
  
  keywords.push('hemp', 'cbd', 'thc', 'cannabis', 'regulation', 'legal', 'law');
  
  const sentences = content.split(/[.!?]+/);
  const relevantSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const matchCount = keywords.filter(keyword => lowerSentence.includes(keyword)).length;
    
    if (matchCount >= 2 || (matchCount >= 1 && sentence.length < 200)) {
      relevantSentences.push(sentence.trim());
    }
  }
  
  if (relevantSentences.length === 0) return null;
  
  return relevantSentences.slice(0, 5).join('. ') + '.';
}

async function queryDriveFilesEnhanced(supabase: any, params: any) {
  // ... keep existing code (queryDriveFilesEnhanced function) the same ...
  try {
    const { query, fileType, brand, category } = params;
    console.log('Enhanced drive files search with params:', params);
    
    // Enhanced keyword extraction that preserves important short words
    const keywords = extractEnhancedKeywords(query);
    console.log('Enhanced keywords extracted:', keywords);
    
    if (keywords.length === 0) {
      console.log('No valid keywords found');
      return [];
    }
    
    // Multi-pass search strategy
    const searchResults = [];
    
    // Pass 1: Exact category + brand + file type match
    if (category && brand && fileType) {
      console.log(`Pass 1: Searching for ${fileType} in ${category} category for ${brand}`);
      const exactResults = await searchWithCriteria(supabase, {
        category: category,
        brand: brand,
        fileNameContains: fileType,
        keywords: keywords
      });
      if (exactResults.length > 0) {
        console.log(`Pass 1 found ${exactResults.length} exact matches`);
        return rankAndSortResults(exactResults, { fileType, brand, category });
      }
    }
    
    // Pass 2: Category + file type match
    if (category && fileType) {
      console.log(`Pass 2: Searching for ${fileType} in ${category} category`);
      const categoryResults = await searchWithCriteria(supabase, {
        category: category,
        fileNameContains: fileType,
        keywords: keywords
      });
      if (categoryResults.length > 0) {
        console.log(`Pass 2 found ${categoryResults.length} category matches`);
        return rankAndSortResults(categoryResults, { fileType, brand, category });
      }
    }
    
    // Pass 3: Brand + file type match
    if (brand && fileType) {
      console.log(`Pass 3: Searching for ${fileType} files from ${brand}`);
      const brandResults = await searchWithCriteria(supabase, {
        brand: brand,
        fileNameContains: fileType,
        keywords: keywords
      });
      if (brandResults.length > 0) {
        console.log(`Pass 3 found ${brandResults.length} brand + file type matches`);
        return rankAndSortResults(brandResults, { fileType, brand, category });
      }
    }
    
    // Pass 4: File type only
    if (fileType) {
      console.log(`Pass 4: Searching for ${fileType} files`);
      const fileTypeResults = await searchWithCriteria(supabase, {
        fileNameContains: fileType,
        keywords: keywords
      });
      if (fileTypeResults.length > 0) {
        console.log(`Pass 4 found ${fileTypeResults.length} file type matches`);
        return rankAndSortResults(fileTypeResults, { fileType, brand, category });
      }
    }
    
    // Pass 5: Keyword-based search as fallback
    console.log('Pass 5: Fallback keyword search');
    const keywordResults = await searchWithCriteria(supabase, {
      keywords: keywords
    });
    
    console.log(`Pass 5 found ${keywordResults.length} keyword matches`);
    return rankAndSortResults(keywordResults, { fileType, brand, category });
    
  } catch (error) {
    console.error('Error in queryDriveFilesEnhanced:', error);
    return [];
  }
}

function extractEnhancedKeywords(query: string): string[] {
  // Preserve important file-related short words
  const importantShortWords = new Set(['logo', 'pdf', 'doc', 'img', 'pic', 'pos']);
  const stopWords = new Set(['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'me', 'find']);
  
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => {
      // Keep important short words even if they're normally filtered
      if (importantShortWords.has(word)) return true;
      // Filter out stop words and very short words
      return word.length > 2 && !stopWords.has(word);
    })
    .slice(0, 8); // Increase limit to capture more context
}

async function searchWithCriteria(supabase: any, criteria: any) {
  try {
    console.log('Searching with criteria:', criteria);
    
    let query = supabase
      .from('drive_files')
      .select(`
        id,
        file_name,
        file_url,
        category,
        brand,
        subcategory_1,
        subcategory_2,
        file_content (
          content
        )
      `);
    
    // Apply category filter
    if (criteria.category) {
      query = query.eq('category', criteria.category);
    }
    
    // Apply brand filter
    if (criteria.brand) {
      query = query.ilike('brand', `%${criteria.brand}%`);
    }
    
    // Apply file name contains filter
    if (criteria.fileNameContains) {
      query = query.ilike('file_name', `%${criteria.fileNameContains}%`);
    }
    
    // Apply keyword filters
    if (criteria.keywords && criteria.keywords.length > 0) {
      const keywordConditions = criteria.keywords.map(keyword => `file_name.ilike.%${keyword}%`);
      const orCondition = keywordConditions.join(',');
      query = query.or(orCondition);
    }
    
    const { data: files, error } = await query.limit(15);
    
    if (error) {
      console.error('Search query error:', error);
      return [];
    }
    
    console.log(`Search criteria returned ${files?.length || 0} results`);
    return files || [];
    
  } catch (error) {
    console.error('Error in searchWithCriteria:', error);
    return [];
  }
}

function rankAndSortResults(results: any[], searchContext: any) {
  const { fileType, brand, category } = searchContext;
  
  return results
    .map(file => {
      let score = 0;
      const fileName = file.file_name.toLowerCase();
      
      // Score based on file type match
      if (fileType && fileName.includes(fileType.toLowerCase())) {
        score += 100;
      }
      
      // Score based on category match
      if (category && file.category === category) {
        score += 50;
      }
      
      // Score based on brand match
      if (brand && file.brand && file.brand.toLowerCase().includes(brand.toLowerCase())) {
        score += 75;
      }
      
      // Boost exact matches
      if (fileType && brand && fileName.includes(fileType.toLowerCase()) && file.brand && file.brand.toLowerCase().includes(brand.toLowerCase())) {
        score += 200;
      }
      
      return { ...file, relevanceScore: score };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map(file => ({
      title: file.file_name,
      content: file.file_content?.[0]?.content || `File: ${file.file_name}`,
      category: file.category,
      brand: file.brand,
      file_name: file.file_name,
      file_url: file.file_url,
      download_url: file.file_url,
      relevanceScore: file.relevanceScore
    }));
}

async function queryKnowledgeBaseEnhanced(supabase: any, params: any) {
  try {
    const { query, tags } = params;
    console.log('Enhanced knowledge base query with params:', params);
    
    const keywords = extractEnhancedKeywords(query);
    console.log('Knowledge base keywords:', keywords);
    
    if (keywords.length === 0 && (!tags || tags.length === 0)) {
      return [];
    }
    
    let queryBuilder = supabase
      .from('knowledge_entries')
      .select('*')
      .eq('is_active', true);
    
    // Build search conditions
    const conditions = [];
    
    // Content-based search
    if (keywords.length > 0) {
      const contentConditions = keywords.map(keyword => `content.ilike.%${keyword}%`);
      conditions.push(contentConditions.join(','));
    }
    
    // Tag-based search
    if (tags && tags.length > 0) {
      const tagConditions = tags.map(tag => `tags.cs.{${tag}}`);
      conditions.push(tagConditions.join(','));
    }
    
    if (conditions.length > 0) {
      queryBuilder = queryBuilder.or(conditions.join(','));
    }
    
    const { data: entries, error } = await queryBuilder.limit(10);
    
    if (error) {
      console.error('Enhanced knowledge base query error:', error);
      return [];
    }
    
    console.log(`Enhanced knowledge base query returned ${entries?.length || 0} results`);
    
    return (entries || []).map(entry => ({
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      lastUpdated: entry.updated_at
    }));
    
  } catch (error) {
    console.error('Error in queryKnowledgeBaseEnhanced:', error);
    return [];
  }
}

async function generateEnhancedAIResponse(openaiApiKey: string, query: string, contextData: any[], queryAnalysis: any, userId: string = 'anonymous') {
  try {
    console.log('Generating enhanced AI response with', contextData.length, 'context items');
    console.log('Query analysis for AI:', queryAnalysis);
    
    // Build personalized system prompt based on user role and query type
    let systemPrompt = `You are Streamline AI, an intelligent assistant for Streamline Group employees. You provide accurate, comprehensive answers using internal company data and authoritative external sources.

**Core Capabilities:**
- Product legality analysis by state with legal reasoning
- Internal document and file retrieval with download links
- Regulatory compliance guidance with source citations
- Sales support with brand-specific materials
- Real-time legal analysis from government sources

**Response Format Requirements:**
1. **Direct Answer**: Provide a clear, immediate answer to the user's question
2. **Legal Reasoning**: For compliance questions, explain the "why" behind regulations
3. **Source Attribution**: Clearly cite all information sources used
4. **Actionable Guidance**: Include next steps or recommendations when applicable
5. **Download Links**: For file requests, provide direct download links using [Download](URL) format

**Response Guidelines by Query Type:**

For **Product Legality Questions**:
- Give clear YES/NO answers when asking about specific products
- Explain the legal reasoning behind the determination
- Include relevant state regulations or excise tax information
- Cite both internal data and government sources when available
- For "why" questions, provide comprehensive legal background

For **File Search Requests**:
- Present files in numbered lists with clear descriptions
- Include download links: [Download](URL) for each relevant file
- Show file categories, brands, and relevance scores
- Group results by relevance with most relevant first
- If specific files aren't found, suggest contacting Marketing or relevant departments

For **List Queries** ("which products", "what products"):
- Provide comprehensive numbered or bulleted lists
- Include product counts and brand information
- Format clearly for easy scanning
- Cite the specific data sources used

For **Complex Legal Analysis**:
- Combine internal data with external government sources
- Provide multi-layered explanations (state law + federal guidelines)
- Include recent enforcement actions or court rulings when available
- Cross-reference multiple authoritative sources

**Source Priority**: Internal State Map > Drive Files > Knowledge Base > Government Sources > External Research

**Citation Format**: Always attribute information to specific sources and include confidence levels when appropriate.

Always be helpful, accurate, professional, and cite your sources appropriately. When in doubt, recommend contacting the compliance team for verification.`;

    // Build enhanced context with intelligent source blending
    let contextText = '';
    
    if (contextData.length > 0) {
      // Group sources by type for better organization
      const sourceGroups = {
        state_map: [],
        state_excise_taxes: [],
        drive_files: [],
        knowledge_base: [],
        firecrawl_legal: []
      };
      
      contextData.forEach(item => {
        const sourceType = item.source || 'unknown';
        if (sourceGroups[sourceType]) {
          sourceGroups[sourceType].push(item);
        }
      });
      
      // Build context text with source grouping
      const contextSections = [];
      
      if (sourceGroups.state_map.length > 0) {
        contextSections.push(`**Product Legality Data:**\n${sourceGroups.state_map.map(item => `- ${item.content}`).join('\n')}`);
      }
      
      if (sourceGroups.state_excise_taxes.length > 0) {
        contextSections.push(`**State Excise Tax Information:**\n${sourceGroups.state_excise_taxes.map(item => `- ${item.content}`).join('\n')}`);
      }
      
      if (sourceGroups.drive_files.length > 0) {
        const filesList = sourceGroups.drive_files.map((item, index) => {
          const downloadLink = item.file_url ? ` - [Download](${item.file_url})` : '';
          const relevanceNote = item.relevanceScore ? ` (Relevance: ${item.relevanceScore})` : '';
          return `${index + 1}. ${item.file_name}${downloadLink}${item.category ? ` (Category: ${item.category})` : ''}${item.brand ? ` (Brand: ${item.brand})` : ''}${relevanceNote}`;
        }).join('\n');
        contextSections.push(`**Available Files:**\n${filesList}`);
      }
      
      if (sourceGroups.knowledge_base.length > 0) {
        contextSections.push(`**Internal Knowledge:**\n${sourceGroups.knowledge_base.map(item => `- ${item.title}: ${item.content}`).join('\n')}`);
      }
      
      if (sourceGroups.firecrawl_legal.length > 0) {
        contextSections.push(`**Government Sources:**\n${sourceGroups.firecrawl_legal.map(item => `- ${item.title}: ${item.content}`).join('\n')}`);
      }
      
      contextText = contextSections.join('\n\n');
    } else {
      contextText = 'No specific information found in internal databases. Providing general guidance based on available knowledge.';
    }

    console.log('Enhanced context sent to AI:', contextText.substring(0, 500) + '...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `User Question: ${query}\n\nQuery Analysis: ${JSON.stringify(queryAnalysis)}\n\nAvailable Information:\n${contextText}\n\nUser ID: ${userId}` 
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error generating enhanced AI response:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.';
  }
}
