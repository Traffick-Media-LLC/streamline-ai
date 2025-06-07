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

    // Extract the user's message and conversation history from the request
    let userMessage = '';
    let conversationHistory = [];
    
    if (requestBody.message) {
      userMessage = requestBody.message;
    } else if (requestBody.messages && Array.isArray(requestBody.messages)) {
      conversationHistory = requestBody.messages;
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
    console.log('Conversation history length:', conversationHistory.length);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Enhanced query analysis with conversation context
    const queryAnalysis = await analyzeQueryWithConversationContext(userMessage, conversationHistory, supabase);
    console.log('Enhanced contextual query analysis:', queryAnalysis);

    let contextData = [];
    let crawlingNotification = '';

    // Intelligent source routing with enhanced decision making
    const sourceStrategy = determineEnhancedSourceStrategy(queryAnalysis);
    console.log('Enhanced source strategy:', sourceStrategy);

    // Check if we should provide a direct answer from internal sources first
    if (sourceStrategy.shouldProvideDirectAnswer) {
      console.log('Providing direct answer from internal sources');
      
      // Query internal sources first
      for (const source of sourceStrategy.internalSources) {
        console.log(`Querying internal source ${source.name}...`);
        
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
          }
          
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
    }

    // Enhanced Firecrawl logic - only crawl when needed
    if (sourceStrategy.shouldCrawlOfficialSources && firecrawlApiKey) {
      console.log('Initiating official source crawling...');
      crawlingNotification = "Let me pull the latest from official sources to confirm that information...";
      
      try {
        const crawledData = await queryFirecrawlLegalSources(firecrawlApiKey, queryAnalysis);
        if (crawledData.length > 0) {
          contextData.push(...crawledData.map(item => ({
            ...item,
            source: 'firecrawl_legal',
            priority: 10
          })));
        }
      } catch (error) {
        console.error('Error crawling official sources:', error);
      }
    }

    // Sort context data by priority and relevance
    contextData = contextData.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    console.log('Total context data items:', contextData.length);

    // Generate enhanced AI response with improved formatting and source transparency
    const aiResponse = await generateEnhancedAIResponse(
      openaiApiKey, 
      userMessage, 
      contextData, 
      queryAnalysis,
      requestBody.userId || 'anonymous',
      crawlingNotification,
      conversationHistory
    );
    
    // Simplified link formatting cleanup
    console.log('AI response before cleanup (first 500 chars):', aiResponse.substring(0, 500));
    
    const cleanedResponse = applySimplifiedFormatCleanup(aiResponse);
    
    console.log('AI response after cleanup (first 500 chars):', cleanedResponse.substring(0, 500));
    
    return new Response(JSON.stringify({ 
      response: cleanedResponse,
      sources: contextData.map(item => ({
        type: item.source,
        title: item.title || item.file_name || 'Document',
        content: item.content || item.summary || 'Content not available',
        priority: item.priority || 0,
        url: item.url || null
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

function applySimplifiedFormatCleanup(response: string): string {
  console.log('Cleaning up AI response (no dashes)...');
  let cleaned = response;

  // 1. Remove leading dashes before links
  cleaned = cleaned.replace(/^[-\*\+]\s*(\[[^\]]+\]\([^)]+\))/gm, '$1');

  // 2. Fix broken links split across lines
  cleaned = cleaned.replace(/^\s*\n\s*(\[[^\]]+\]\([^)]+\))/gm, '$1');

  // 3. Remove any extra empty lines between links
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // 4. Normalize section header spacing
  cleaned = cleaned.replace(/(\*\*[^\*]+\*\*)\s*\n+/g, '$1\n');

  console.log('Simplified format cleanup completed');
  
  return cleaned.trim();
}

async function analyzeQueryWithConversationContext(query: string, conversationHistory: any[], supabase: any) {
  if (!query || typeof query !== 'string') {
    console.error('Invalid query provided to analyzeQuery:', query);
    return {
      isProductLegality: false,
      isFileSearch: false,
      requiresLegalAnalysis: false,
      requiresOfficialCrawling: false,
      isWhyBannedQuestion: false,
      isBillTextRequest: false,
      isEnforcementRequest: false,
      product: null,
      brand: null,
      state: null,
      isListQuery: false,
      fileType: null,
      category: null,
      tags: [],
      legalComplexity: 'basic',
      intentType: 'general',
      confidenceLevel: 'low',
      inheritedContext: {}
    };
  }

  // Extract context from conversation history
  const inheritedContext = extractConversationContext(conversationHistory);
  console.log('Inherited context from conversation:', inheritedContext);

  const lowerQuery = query.toLowerCase();
  
  // Enhanced legal analysis detection with specific triggers
  const legalKeywords = ['legal', 'legality', 'allowed', 'permitted', 'banned', 'prohibited', 'can i', 'available', 'compliance', 'regulation', 'law', 'ruling', 'enforcement', 'court', 'legislation'];
  const complexLegalKeywords = ['why', 'explain', 'ruling', 'court', 'enforcement', 'bulletin', 'legislation', 'recent', 'updated', 'changed'];
  const officialSourceTriggers = ['why banned', 'why prohibited', 'bill text', 'enforcement action', 'recent ruling', 'updated law', 'latest regulation'];
  
  const hasLegalKeyword = legalKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasComplexLegalKeyword = complexLegalKeywords.some(keyword => lowerQuery.includes(keyword));
  const requiresLegalAnalysis = hasLegalKeyword && (hasComplexLegalKeyword || lowerQuery.includes('why'));
  
  // Specific triggers for official source crawling
  const isWhyBannedQuestion = lowerQuery.includes('why') && (lowerQuery.includes('banned') || lowerQuery.includes('prohibited') || lowerQuery.includes('not legal'));
  const isBillTextRequest = lowerQuery.includes('bill') || lowerQuery.includes('legislation text') || lowerQuery.includes('law text');
  const isEnforcementRequest = lowerQuery.includes('enforcement') || lowerQuery.includes('memo') || lowerQuery.includes('bulletin');
  const requiresOfficialCrawling = isWhyBannedQuestion || isBillTextRequest || isEnforcementRequest || 
    officialSourceTriggers.some(trigger => lowerQuery.includes(trigger));
  
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
  
  // Enhanced state detection - check current query first, then inherited context
  let detectedState = await detectStateInText(lowerQuery, supabase) || inheritedContext.state;
  
  // Enhanced brand detection - check current query first, then inherited context
  let detectedBrand = await detectBrandInText(lowerQuery, supabase) || inheritedContext.brand;
  
  // Enhanced product detection - check current query first, then inherited context
  let detectedProduct = detectProductInText(lowerQuery) || inheritedContext.product;
  
  // Special handling for contextual follow-up questions
  if (isContextualFollowUp(query, inheritedContext)) {
    console.log('Detected contextual follow-up question');
    
    // For queries like "what about [brand]" inherit the previous state and question type
    if (inheritedContext.state && !detectedState) {
      detectedState = inheritedContext.state;
      console.log(`Inherited state: ${detectedState}`);
    }
    
    // If this is asking about a brand in context of previous legal question
    if (inheritedContext.wasLegalQuery && detectedBrand && !hasLegalKeyword) {
      console.log('Adding legal context to brand follow-up');
      // This becomes a legal query about the new brand in the same state
    }
  }
  
  // List query detection
  const listKeywords = ['which', 'what', 'list', 'all', 'what are', 'show me'];
  const isListQuery = listKeywords.some(keyword => lowerQuery.includes(keyword)) || inheritedContext.wasListQuery;
  
  // Intent type classification with enhanced categories
  let intentType = 'general';
  if (hasFileKeyword) intentType = 'file_search';
  else if (isWhyBannedQuestion) intentType = 'why_banned_inquiry';
  else if (isBillTextRequest) intentType = 'bill_text_request';
  else if (isEnforcementRequest) intentType = 'enforcement_inquiry';
  else if (hasLegalKeyword || inheritedContext.wasLegalQuery) intentType = 'legal_inquiry';
  else if (isListQuery) intentType = 'list_request';
  
  // Enhanced confidence level assessment
  let confidenceLevel = 'low';
  if ((detectedBrand && detectedProduct && detectedState) || 
      (hasFileKeyword && detectedBrand && detectedFileType)) {
    confidenceLevel = 'high';
  } else if ((detectedBrand && detectedState) || 
             (hasFileKeyword && detectedFileType) ||
             (hasLegalKeyword && detectedState)) {
    confidenceLevel = 'medium';
  }
  
  // Legal complexity assessment
  let legalComplexity = 'basic';
  if (requiresOfficialCrawling || isWhyBannedQuestion) legalComplexity = 'complex';
  else if (requiresLegalAnalysis) legalComplexity = 'moderate';
  else if (hasLegalKeyword) legalComplexity = 'basic';
  
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
  if (requiresOfficialCrawling) tags.push('official_sources');
  
  return {
    isProductLegality: hasLegalKeyword && (detectedProduct || detectedBrand || detectedState),
    isFileSearch: hasFileKeyword,
    requiresLegalAnalysis,
    requiresOfficialCrawling,
    isWhyBannedQuestion,
    isBillTextRequest,
    isEnforcementRequest,
    product: detectedProduct,
    brand: detectedBrand,
    state: detectedState,
    isListQuery,
    fileType: detectedFileType,
    category: detectedCategory,
    tags,
    legalComplexity,
    intentType,
    confidenceLevel,
    inheritedContext
  };
}

function extractConversationContext(conversationHistory: any[]) {
  const context: any = {
    state: null,
    brand: null,
    product: null,
    wasLegalQuery: false,
    wasListQuery: false
  };
  
  if (!conversationHistory || conversationHistory.length === 0) {
    return context;
  }
  
  // Look at the last few messages for context (prioritize recent messages)
  const recentMessages = conversationHistory.slice(-6); // Last 6 messages
  
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const message = recentMessages[i];
    
    if (message.role === 'user') {
      const userQuery = message.content.toLowerCase();
      
      // Extract state mentions
      if (!context.state) {
        const stateMatch = userQuery.match(/\b(florida|california|texas|new york|illinois|pennsylvania|ohio|georgia|north carolina|michigan|new jersey|virginia|washington|arizona|massachusetts|tennessee|indiana|missouri|maryland|wisconsin|colorado|minnesota|south carolina|alabama|louisiana|kentucky|oregon|oklahoma|connecticut|utah|iowa|nevada|arkansas|mississippi|kansas|new mexico|nebraska|west virginia|idaho|hawaii|new hampshire|maine|montana|rhode island|delaware|south dakota|north dakota|alaska|vermont|wyoming)\b/i);
        if (stateMatch) {
          context.state = stateMatch[1].charAt(0).toUpperCase() + stateMatch[1].slice(1);
        }
      }
      
      // Extract brand mentions
      if (!context.brand) {
        const brandMatch = userQuery.match(/\b(juice head|galaxy treats|orbital|thca|delta|hemp|cbd)\b/i);
        if (brandMatch) {
          context.brand = brandMatch[1];
        }
      }
      
      // Detect if it was a legal query
      if (!context.wasLegalQuery) {
        const legalKeywords = ['legal', 'legality', 'allowed', 'permitted', 'banned', 'prohibited'];
        context.wasLegalQuery = legalKeywords.some(keyword => userQuery.includes(keyword));
      }
      
      // Detect if it was a list query
      if (!context.wasListQuery) {
        const listKeywords = ['which', 'what', 'list', 'all', 'what are', 'show me'];
        context.wasListQuery = listKeywords.some(keyword => userQuery.includes(keyword));
      }
    } else if (message.role === 'assistant') {
      // Extract context from AI responses
      const aiResponse = message.content.toLowerCase();
      
      // Look for state mentions in AI responses
      if (!context.state) {
        const stateMatch = aiResponse.match(/\bin (florida|california|texas|new york|illinois|pennsylvania|ohio|georgia|north carolina|michigan|new jersey|virginia|washington|arizona|massachusetts|tennessee|indiana|missouri|maryland|wisconsin|colorado|minnesota|south carolina|alabama|louisiana|kentucky|oregon|oklahoma|connecticut|utah|iowa|nevada|arkansas|mississippi|kansas|new mexico|nebraska|west virginia|idaho|hawaii|new hampshire|maine|montana|rhode island|delaware|south dakota|north dakota|alaska|vermont|wyoming)\b/i);
        if (stateMatch) {
          context.state = stateMatch[1].charAt(0).toUpperCase() + stateMatch[1].slice(1);
        }
      }
      
      // Look for brand mentions in AI responses
      if (!context.brand) {
        const brandMatch = aiResponse.match(/\b(juice head|galaxy treats|orbital|thca|delta|hemp|cbd)\b/i);
        if (brandMatch) {
          context.brand = brandMatch[1];
        }
      }
    }
  }
  
  return context;
}

function isContextualFollowUp(query: string, inheritedContext: any) {
  const lowerQuery = query.toLowerCase().trim();
  
  // Patterns that indicate a contextual follow-up
  const followUpPatterns = [
    /^what about\s+/,
    /^how about\s+/,
    /^and\s+/,
    /^also\s+/
  ];
  
  // Check if the query is short and matches follow-up patterns
  const isShortFollowUp = lowerQuery.length < 30 && followUpPatterns.some(pattern => pattern.test(lowerQuery));
  
  // Check if we have meaningful inherited context
  const hasInheritedContext = inheritedContext.state || inheritedContext.wasLegalQuery || inheritedContext.wasListQuery;
  
  return isShortFollowUp && hasInheritedContext;
}

async function detectStateInText(text: string, supabase: any) {
  try {
    const { data: states, error } = await supabase
      .from('states')
      .select('name');
    
    if (!error && states) {
      for (const state of states) {
        const statePattern = new RegExp(`\\b${state.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (statePattern.test(text)) {
          return state.name;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching states:', error);
  }
  return null;
}

async function detectBrandInText(text: string, supabase: any) {
  try {
    const { data: brands, error } = await supabase
      .from('brands')
      .select('name');
    
    if (!error && brands) {
      for (const brand of brands) {
        const brandPattern = new RegExp(`\\b${brand.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (brandPattern.test(text)) {
          return brand.name;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching brands:', error);
  }
  return null;
}

function detectProductInText(text: string) {
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
    if (productMatch.pattern.test(text)) {
      return productMatch.name;
    }
  }
  return null;
}

function determineEnhancedSourceStrategy(queryAnalysis: any) {
  const internalSources = [];
  const shouldProvideDirectAnswer = queryAnalysis.confidenceLevel === 'high' || 
    (queryAnalysis.confidenceLevel === 'medium' && !queryAnalysis.requiresOfficialCrawling);
  
  // Enhanced decision logic for when to crawl official sources
  const shouldCrawlOfficialSources = queryAnalysis.requiresOfficialCrawling || 
    (queryAnalysis.isWhyBannedQuestion && queryAnalysis.confidenceLevel === 'low') ||
    queryAnalysis.isBillTextRequest ||
    queryAnalysis.isEnforcementRequest ||
    (queryAnalysis.requiresLegalAnalysis && queryAnalysis.legalComplexity === 'complex');
  
  // Priority-based internal source selection - only include files when explicitly requested
  if (queryAnalysis.isFileSearch) {
    internalSources.push({ name: 'drive_files', priority: 10 });
    internalSources.push({ name: 'knowledge_base', priority: 7 });
  }
  
  if (queryAnalysis.isProductLegality) {
    internalSources.push({ name: 'state_map', priority: 10 });
    if (queryAnalysis.state) {
      internalSources.push({ name: 'state_excise_taxes', priority: 8 });
    }
    internalSources.push({ name: 'knowledge_base', priority: 6 });
    // Only include files for legality questions if explicitly requested
    if (queryAnalysis.isFileSearch) {
      internalSources.push({ name: 'drive_files', priority: 5 });
    }
  }
  
  // For general queries, focus on knowledge base and only include files/state data if contextually relevant
  if (queryAnalysis.intentType === 'general' || internalSources.length === 0) {
    internalSources.push({ name: 'knowledge_base', priority: 8 });
    
    // Only include files if this is a file search or has file-related context
    if (queryAnalysis.isFileSearch) {
      internalSources.push({ name: 'drive_files', priority: 6 });
    }
    
    // Only include state data if a state is mentioned
    if (queryAnalysis.state) {
      internalSources.push({ name: 'state_map', priority: 7 });
    }
  }
  
  // Remove duplicates and sort by priority
  const uniqueInternalSources = internalSources.filter((source, index, self) => 
    index === self.findIndex(s => s.name === source.name)
  ).sort((a, b) => b.priority - a.priority);
  
  return {
    internalSources: uniqueInternalSources,
    shouldProvideDirectAnswer,
    shouldCrawlOfficialSources,
    strategy: shouldCrawlOfficialSources ? 'comprehensive_legal_with_crawling' : 
              shouldProvideDirectAnswer ? 'direct_internal_answer' : 'standard'
  };
}

async function queryStateMapEnhanced(supabase: any, params: any) {
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
    console.log('Initiating enhanced Firecrawl legal source crawling for official sources');

    const { state, product, brand, isWhyBannedQuestion, isBillTextRequest, isEnforcementRequest } = queryAnalysis;
    
    // Build targeted government URLs for crawling with enhanced focus
    const govUrls = [];
    
    if (state) {
      // State-specific government sites with enhanced targeting
      const stateCode = getStateCode(state);
      if (stateCode) {
        // Primary state government sites
        govUrls.push(`https://www.${stateCode.toLowerCase()}.gov`);
        govUrls.push(`https://${stateCode.toLowerCase()}.gov`);
        
        // State-specific regulatory pages for cannabis/hemp
        if (product && (product.toLowerCase().includes('hemp') || product.toLowerCase().includes('cbd') || product.toLowerCase().includes('thc'))) {
          govUrls.push(`https://www.${stateCode.toLowerCase()}.gov/cannabis`);
          govUrls.push(`https://www.${stateCode.toLowerCase()}.gov/hemp`);
          govUrls.push(`https://www.${stateCode.toLowerCase()}.gov/marijuana`);
        }
      }
    }
    
    // Federal sources for hemp/cannabis regulations with enhanced targeting
    if (product && (product.toLowerCase().includes('hemp') || product.toLowerCase().includes('cbd') || product.toLowerCase().includes('thc'))) {
      govUrls.push('https://www.fda.gov/news-events/public-health-focus/fda-regulation-cannabis-and-cannabis-derived-products');
      govUrls.push('https://www.usda.gov/topics/farming/hemp');
      govUrls.push('https://www.fda.gov/consumers/consumer-updates/what-you-need-know-and-what-were-working-find-out-about-products-containing-cannabis-or-cannabis');
    }

    // Enhanced targeting based on query type
    if (isBillTextRequest || isEnforcementRequest) {
      if (state) {
        const stateCode = getStateCode(state);
        if (stateCode) {
          govUrls.push(`https://www.${stateCode.toLowerCase()}.gov/legislature`);
          govUrls.push(`https://www.${stateCode.toLowerCase()}.gov/laws`);
        }
      }
    }

    if (govUrls.length === 0) {
      console.log('No relevant government URLs identified for crawling');
      return [];
    }

    const results = [];
    
    for (const url of govUrls.slice(0, 3)) { // Increased to 3 URLs for better coverage
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
          
          // Extract relevant content based on query with enhanced filtering
          const content = crawlData.data.markdown || crawlData.data.content || '';
          const relevantContent = extractRelevantLegalContent(content, queryAnalysis);
          
          if (relevantContent) {
            results.push({
              title: `Official Government Source: ${url}`,
              content: relevantContent,
              url: url,
              source: 'firecrawl_legal',
              crawledAt: new Date().toISOString(),
              sourceType: 'government'
            });
          }
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
      }
    }

    console.log(`Enhanced Firecrawl returned ${results.length} official government sources`);
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
  const { product, brand, state, isWhyBannedQuestion, isBillTextRequest, isEnforcementRequest } = queryAnalysis;
  const keywords = [];
  
  if (product) keywords.push(product.toLowerCase());
  if (brand) keywords.push(brand.toLowerCase());
  if (state) keywords.push(state.toLowerCase());
  
  // Enhanced keywords based on query type
  keywords.push('hemp', 'cbd', 'thc', 'cannabis', 'regulation', 'legal', 'law');
  
  if (isWhyBannedQuestion) {
    keywords.push('banned', 'prohibited', 'restriction', 'violation');
  }
  
  if (isBillTextRequest) {
    keywords.push('bill', 'legislation', 'statute', 'code', 'section');
  }
  
  if (isEnforcementRequest) {
    keywords.push('enforcement', 'violation', 'penalty', 'compliance', 'inspection');
  }
  
  const sentences = content.split(/[.!?]+/);
  const relevantSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const matchCount = keywords.filter(keyword => lowerSentence.includes(keyword)).length;
    
    // Enhanced matching criteria
    if (matchCount >= 2 || (matchCount >= 1 && sentence.length < 300)) {
      relevantSentences.push(sentence.trim());
    }
  }
  
  if (relevantSentences.length === 0) return null;
  
  // Return more content for complex queries
  const maxSentences = queryAnalysis.legalComplexity === 'complex' ? 8 : 5;
  return relevantSentences.slice(0, maxSentences).join('. ') + '.';
}

async function queryDriveFilesEnhanced(supabase: any, params: any) {
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

async function generateEnhancedAIResponse(openaiApiKey: string, query: string, contextData: any[], queryAnalysis: any, userId: string = 'anonymous', crawlingNotification: string = '', conversationHistory: any[] = []) {
  try {
    console.log('Generating enhanced AI response with', contextData.length, 'context items');
    console.log('Query analysis for AI:', queryAnalysis);
    
    // Build enhanced system prompt with real URLs and simplified formatting guidelines
    let systemPrompt = `You are Streamline AI, a friendly business co-founder and expert assistant for Streamline Group employees. You provide accurate, comprehensive answers using internal company data and authoritative external sources, including official government sources when available.

**TONE AND COMMUNICATION STYLE:**
- Speak like a friendly, experienced co-founder — confident, concise, and clear
- Avoid robotic or overly formal language - be conversational and personable  
- Give practical examples when useful to illustrate your points
- Show genuine interest in helping their business succeed
- Use "we" language when appropriate to feel like a true business partner

**CONTEXTUAL AWARENESS:**
- You have access to the full conversation history and can understand follow-up questions in context
- When users ask vague follow-ups like "what about [brand]", use context from previous messages to understand the complete question
- If a previous question was about product legality in a specific state, and the user asks "what about [different brand]", assume they're asking about that brand's legality in the same state
- Maintain conversation flow naturally without asking redundant clarification questions
- Reference previous context when relevant to show you understand the ongoing conversation

**RESPONSE FORMATTING REQUIREMENTS (CRITICAL):**
- ALWAYS use **bold headings** for each major topic or section
- Break up responses using bullet points or numbered lists for clarity
- Use proper paragraph spacing between major ideas (double line breaks)
- Keep responses mobile-optimized — avoid dense blocks of text
- Highlight action steps clearly (e.g., "Start by doing X, then move to Y")

For numbered lists, ensure proper spacing around each point:

1. **First point** - Clear explanation with actionable details

2. **Second point** - Adequate spacing and concrete guidance  

3. **Third point** - Maintaining consistency throughout

- Use \`backticks\` when mentioning specific tools, technologies, or technical terms
- Break up long responses into digestible sections with descriptive **bold headers**
- End complex advice with a clear "**Next Steps**" or "**Key Takeaways**" section
- Use horizontal rules (---) to separate major sections when helpful
- Ensure code blocks or examples have proper spacing around them

**FILE & LINK FORMATTING GUIDELINES (SIMPLIFIED):**

When presenting file links:
- DO NOT use bullet points or dashes
- List links directly on their own lines, grouped under bold section headings
- ALWAYS format like this:

**Marketing Materials**
[Juice Head POS Kit](https://drive.streamlinegroup.io/pos-kit)
[Juice Head Logo Package](https://drive.streamlinegroup.io/logo.zip)
[Juice Head Sales Sheet](https://drive.streamlinegroup.io/sales-sheet)

- NEVER format like this:

- [POS Kit](...)
- [Sales Sheet](...)

- Do not include icons, colors, or extra line breaks between links
- Use plain black/gray underlined text on the frontend

**ENGAGEMENT AND CONVERSATION FLOW:**
- End responses with helpful prompts to continue the conversation, such as:
  - "Want help drafting that?"
  - "Would you like a quick framework for that?"
  - "Let me know if you want templates or tools for this."
  - "Should we dive deeper into any of these areas?"
  - "Would it help if I created a step-by-step plan for this?"
  - "Should I crawl their website to get more current information?"
- Make conversations feel interactive and supportive
- Always leave the door open for follow-up questions or clarifications

**OFFICIAL SOURCE CRAWLING CAPABILITIES:**
- When using information from official government sources (.gov sites, state legislature, FDA, etc.), ALWAYS cite the source transparently
- Use language like "According to this official government source..." or "Based on current .gov information..."
- Include the URL when available for government sources
- When information comes from internal databases vs external crawling, make this distinction clear

**Core Capabilities:**
- Product legality analysis by state with business reasoning
- Internal document and file retrieval with download links
- Regulatory compliance guidance with source citations
- Sales support with brand-specific materials
- Real-time legal analysis from government sources via official website crawling

**Response Format Guidelines by Query Type:**

For **Product Legality Questions**:
- Give clear YES/NO answers when asking about specific products
- Explain the business reasoning behind the determination
- Include relevant state regulations or excise tax information
- Cite both internal data and government sources when available
- For "why" questions, provide comprehensive background with business context and official source citations

For **File Search Requests**:
- Present files using the simplified link formatting under bold section headings
- Group files by category (Marketing Materials, Product Images, etc.)
- ALWAYS use direct links without bullet points
- Include relevant notes or disclaimers for each section
- If specific files aren't found, suggest contacting Marketing or relevant departments

For **List Queries** ("which products", "what products"):
- Provide comprehensive numbered or bulleted lists
- Include product counts and brand information
- Format clearly for easy scanning
- Cite the specific data sources used

For **Complex Analysis with Official Sources**:
- Combine internal data with external government sources
- Provide multi-layered explanations with business implications
- Include recent developments or changes when available from official sources
- Cross-reference multiple authoritative sources with clear attribution
- Use phrases like "According to official government sources..." when appropriate

**Source Priority**: Internal State Map > Official Government Sources (when crawled) > Drive Files > Knowledge Base > External Research

**Citation Format**: Always attribute information to specific sources and include confidence levels when appropriate. For government sources, include "Official Source:" prefix and URL when available.

Always be helpful, accurate, professional, and cite your sources appropriately. When in doubt, recommend contacting the compliance team for verification.`;

    // Include crawling notification if official sources were accessed
    if (crawlingNotification) {
      systemPrompt += `\n\n**CRAWLING NOTIFICATION**: You accessed official government sources for this query. Make sure to mention this and cite the sources appropriately.`;
    }

    // Build enhanced context with intelligent source blending and official source highlighting
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
        contextSections.push(`**Product Legality Data (Internal Database):**\n${sourceGroups.state_map.map(item => `- ${item.content}`).join('\n')}`);
      }
      
      if (sourceGroups.state_excise_taxes.length > 0) {
        contextSections.push(`**State Excise Tax Information (Internal Database):**\n${sourceGroups.state_excise_taxes.map(item => `- ${item.content}`).join('\n')}`);
      }
      
      if (sourceGroups.firecrawl_legal.length > 0) {
        const officialSources = sourceGroups.firecrawl_legal.map(item => {
          const urlInfo = item.url ? ` - Source URL: ${item.url}` : '';
          return `- **Official Government Source**: ${item.content}${urlInfo}`;
        }).join('\n');
        contextSections.push(`**Official Government Sources (Recently Crawled):**\n${officialSources}`);
      }
      
      if (sourceGroups.drive_files.length > 0) {
        const filesList = sourceGroups.drive_files.map(item => {
          const downloadLink = item.file_url ? `[${item.file_name}](${item.file_url})` : item.file_name;
          const relevanceNote = item.relevanceScore ? ` (Relevance: ${item.relevanceScore})` : '';
          return `${downloadLink}${item.category ? ` (Category: ${item.category})` : ''}${item.brand ? ` (Brand: ${item.brand})` : ''}${relevanceNote}`;
        }).join('\n');
        contextSections.push(`**Available Files (Internal Drive):**\n${filesList}`);
      }
      
      if (sourceGroups.knowledge_base.length > 0) {
        contextSections.push(`**Internal Knowledge Base:**\n${sourceGroups.knowledge_base.map(item => `- ${item.title}: ${item.content}`).join('\n')}`);
      }
      
      contextText = contextSections.join('\n\n');
    } else {
      contextText = 'No specific information found in internal databases. Providing general guidance based on available knowledge.';
    }

    // Add crawling notification to context if applicable
    if (crawlingNotification) {
      contextText = `${crawlingNotification}\n\n${contextText}`;
    }

    // Build conversation context summary for better understanding
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-4); // Last 4 messages for context
      conversationContext = `\n\n**Recent Conversation Context:**\n${recentMessages.map(msg => `${msg.role}: ${msg.content.substring(0, 200)}...`).join('\n')}`;
    }

    console.log('Enhanced context sent to AI:', contextText.substring(0, 500) + '...');

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
          { 
            role: 'user', 
            content: `User Question: ${query}\n\nQuery Analysis: ${JSON.stringify(queryAnalysis)}\n\nAvailable Information:\n${contextText}${conversationContext}\n\nUser ID: ${userId}` 
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
    
    // Enhanced response validation
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid OpenAI response structure:', data);
      return 'I apologize, but I received an invalid response from the AI service. Please try again or contact support if the issue persists.';
    }
    
    if (!data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      console.error('Missing content in OpenAI response:', data.choices[0]);
      return 'I apologize, but I received an incomplete response from the AI service. Please try again or contact support if the issue persists.';
    }
    
    return data.choices[0].message.content;

  } catch (error) {
    console.error('Error generating enhanced AI response:', error);
    return 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.';
  }
}
