
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, chatId, userId, userInfo } = await req.json();
    
    console.log('Received request:', { 
      messageCount: messages?.length, 
      chatId, 
      userId, 
      userInfo: userInfo ? `${userInfo.firstName} (${userInfo.email})` : 'No user info'
    });

    // Validate required inputs
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and must not be empty');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // OpenAI setup
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found');
    }

    // Enhanced system prompt with proper formatting and confidence instructions
    const createSystemPrompt = (userInfo: any) => {
      const nameInstructions = userInfo?.firstName 
        ? `The user's name is ${userInfo.firstName}${userInfo.fullName ? ` (full name: ${userInfo.fullName})` : ''}. Use their first name naturally in conversation when appropriate - for greetings, follow-ups, and when asking clarifying questions. Don't overuse it, but make the conversation feel personal and friendly.` 
        : '';

      return `You are Streamline AI, a knowledgeable assistant specializing in cannabis industry regulations, product legality, and company information. ${nameInstructions}

Your primary functions are:
1. Answer questions about cannabis product legality across different states
2. Provide information about state-specific regulations and requirements
3. Search and retrieve company files and documents when requested
4. Provide ingredient information and product details
5. Offer guidance on compliance and regulatory matters

FORMATTING INSTRUCTIONS:
- Use **Bold Text** for headers and emphasis, never use ### markdown headers
- When listing products, use clean bullet points or numbered lists
- Format responses clearly and professionally

CONFIDENCE GUIDELINES:
- When products are found in the state_allowed_products database, they are DEFINITIVELY legal - state this confidently without disclaimers
- Only add compliance disclaimers when you lack specific data or when dealing with general regulatory questions
- Products in our database have already undergone due diligence - trust this data

Always be helpful, professional, and accurate in your responses. When you have specific information from our databases, present it confidently.`;
    };

    const systemPrompt = createSystemPrompt(userInfo);

    // Get the last user message for analysis
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Analyze the query to determine search strategy
    const queryAnalysis = await analyzeQuery(lastUserMessage, supabase);
    console.log('Query analysis:', queryAnalysis);

    let searchResults = [];
    let sourceInfo = {
      found: false,
      source: 'no_match' as const,
      message: 'No relevant information found.'
    };

    // Search strategy based on query type - prioritize state_allowed_products for legality
    if (queryAnalysis.needsSearch) {
      try {
        // PRIORITY: Search state allowed products first for definitive legality questions
        if (queryAnalysis.isLegalityQuery && queryAnalysis.stateFilter) {
          const stateResults = await searchStateAllowedProducts(supabase, queryAnalysis);
          if (stateResults.length > 0) {
            searchResults.push(...stateResults);
            sourceInfo = {
              found: true,
              source: 'state_allowed_products' as const,
              message: `Found ${stateResults.length} product(s) definitively legal in ${queryAnalysis.stateFilter}.`
            };
          }
        }

        // Search Drive files for documents - HIGH PRIORITY for document queries
        if (queryAnalysis.isDocumentQuery) {
          const driveResults = await searchDriveFiles(supabase, queryAnalysis);
          if (driveResults.length > 0) {
            searchResults.push(...driveResults);
            sourceInfo = {
              found: true,
              source: 'drive_files' as const,
              message: `Found ${driveResults.length} relevant document(s).`
            };
          }
        }

        // Search products database if query seems product-related and no results yet
        if (queryAnalysis.isProductQuery && searchResults.length === 0) {
          const productResults = await searchProducts(supabase, queryAnalysis);
          if (productResults.length > 0) {
            searchResults.push(...productResults);
            sourceInfo = {
              found: true,
              source: 'product_database' as const,
              message: `Found ${productResults.length} relevant product(s).`
            };
          }
        }

        // Search brand database if query seems brand-related and no results yet
        if (queryAnalysis.isBrandQuery && searchResults.length === 0) {
          const brandResults = await searchBrands(supabase, queryAnalysis);
          if (brandResults.length > 0) {
            searchResults.push(...brandResults);
            sourceInfo = {
              found: true,
              source: 'brand_database' as const,
              message: `Found ${brandResults.length} relevant brand(s).`
            };
          }
        }

        // Search Drive files as fallback for any query if no other results found
        if (searchResults.length === 0) {
          const driveResults = await searchDriveFiles(supabase, queryAnalysis);
          if (driveResults.length > 0) {
            searchResults.push(...driveResults);
            sourceInfo = {
              found: true,
              source: 'drive_files' as const,
              message: `Found ${driveResults.length} relevant document(s).`
            };
          }
        }

      } catch (searchError) {
        console.error('Search error:', searchError);
        sourceInfo = {
          found: false,
          source: 'database_error' as const,
          error: searchError.message
        };
      }
    }

    // Prepare context for AI
    let contextInfo = '';
    if (searchResults.length > 0) {
      contextInfo = `\n\nRelevant information found:\n${searchResults.map(result => `- ${result}`).join('\n')}`;
    }

    // Prepare messages for OpenAI
    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
    ];

    // Add context to the last user message if we found relevant information
    if (contextInfo) {
      aiMessages[aiMessages.length - 1].content += contextInfo;
    }

    console.log('Calling OpenAI with messages:', aiMessages.length);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: aiMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const aiResponse = data.choices?.[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response content from OpenAI');
    }

    return new Response(JSON.stringify({
      response: aiResponse,
      sourceInfo: sourceInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in streamline-ai function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      response: "I'm sorry, I encountered an error while processing your request. Please try again or contact support."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Enhanced helper function to analyze user queries with improved document and brand detection
async function analyzeQuery(query: string, supabase: any) {
  const lowerQuery = query.toLowerCase();
  
  // Detect search intent
  const needsSearch = true; // Always search for now
  
  // Detect legality-related queries
  const legalityKeywords = ['legal', 'legality', 'allowed', 'permitted', 'can sell', 'can i sell'];
  const isLegalityQuery = legalityKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Detect product-related queries
  const productKeywords = ['product', 'strain', 'flower', 'edible', 'vape', 'cartridge', 'concentrate', 'thc', 'cbd', 'mg'];
  const isProductQuery = productKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Detect brand-related queries  
  const brandKeywords = ['brand', 'company', 'manufacturer', 'producer'];
  const isBrandQuery = brandKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // EXPANDED: Detect document/file queries with more keywords
  const documentKeywords = [
    'document', 'file', 'pdf', 'report', 'certificate', 'lab', 'test', 'coa', 'compliance',
    'brochure', 'brochures', 'sales', 'sheet', 'sheets', 'material', 'materials', 
    'marketing', 'flyer', 'flyers', 'catalog', 'spec', 'specs', 'datasheet'
  ];
  const isDocumentQuery = documentKeywords.some(keyword => lowerQuery.includes(keyword));

  // Enhanced brand detection - check against actual brand names in database
  let brandFilter = null;
  
  try {
    // Get all brand names from database
    const { data: brands, error } = await supabase
      .from('brands')
      .select('name');
    
    if (!error && brands) {
      // Check each word in the query against brand names
      const queryWords = lowerQuery.split(/\s+/);
      
      for (const brand of brands) {
        const brandName = brand.name.toLowerCase();
        
        // Direct brand name match
        if (lowerQuery.includes(brandName)) {
          brandFilter = brand.name;
          break;
        }
        
        // Check individual words for partial matches
        for (const word of queryWords) {
          if (word === 'mcro' && brandName === 'mcro') {
            brandFilter = 'MCRO';
            break;
          }
          if (brandName.includes(word) && word.length > 2) {
            brandFilter = brand.name;
            break;
          }
        }
        
        if (brandFilter) break;
      }
      
      // Special handling for common brand name variations
      if (!brandFilter) {
        const brandVariations = {
          'mcro': 'MCRO',
          'galaxy treats': 'Galaxy Treats',
          'galazy treats': 'Galaxy Treats', // Common typo
          'juice head': 'Juice Head',
          'juicehead': 'Juice Head'
        };
        
        for (const [variation, actualName] of Object.entries(brandVariations)) {
          if (lowerQuery.includes(variation)) {
            brandFilter = actualName;
            break;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching brands for analysis:', error);
  }

  // Extract state filter
  let stateFilter = null;
  const stateKeywords = ['florida', 'california', 'texas', 'new york', 'colorado', 'oregon', 'washington'];
  for (const state of stateKeywords) {
    if (lowerQuery.includes(state)) {
      stateFilter = state.charAt(0).toUpperCase() + state.slice(1);
      break;
    }
  }

  console.log('Enhanced query analysis:', {
    needsSearch,
    isLegalityQuery,
    isProductQuery,
    isBrandQuery, 
    isDocumentQuery,
    brandFilter,
    stateFilter,
    searchTerms: lowerQuery.split(' ').filter(term => term.length > 2)
  });

  return {
    needsSearch,
    isLegalityQuery,
    isProductQuery,
    isBrandQuery, 
    isDocumentQuery,
    brandFilter,
    stateFilter,
    searchTerms: lowerQuery.split(' ').filter(term => term.length > 2)
  };
}

// Fixed function to search state allowed products with proper query structure
async function searchStateAllowedProducts(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching state allowed products with analysis:', queryAnalysis);
    
    // Get the state ID first
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id')
      .ilike('name', `%${queryAnalysis.stateFilter}%`)
      .limit(1);
    
    if (stateError || !stateData || stateData.length === 0) {
      console.log('State not found:', queryAnalysis.stateFilter);
      return [];
    }
    
    const stateId = stateData[0].id;
    
    // Build the query with proper joins
    let query = supabase
      .from('state_allowed_products')
      .select(`
        id,
        products!inner (
          id,
          name,
          brands!inner (
            name,
            logo_url
          )
        ),
        states!inner (
          name
        )
      `)
      .eq('state_id', stateId);

    // Apply brand filter if specified - filter on the joined brands table
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter to state allowed products:', queryAnalysis.brandFilter);
      query = query.eq('products.brands.name', queryAnalysis.brandFilter);
    }

    const { data: allowedProducts, error } = await query.limit(20);

    if (error) {
      console.error('State allowed products search error:', error);
      return [];
    }

    if (!allowedProducts || allowedProducts.length === 0) {
      console.log('No state allowed products found');
      return [];
    }

    console.log(`Found ${allowedProducts.length} state allowed products`);

    // Format the results cleanly with proper brand attribution
    return allowedProducts.map(item => {
      const product = item.products;
      const brand = product?.brands;
      const state = item.states;
      
      return `${brand?.name || 'Unknown Brand'} - ${product?.name || 'Unknown Product'} (Legal in ${state?.name || 'Unknown State'})`;
    });

  } catch (error) {
    console.error('State allowed products search error:', error);
    return [];
  }
}

// Search products database
async function searchProducts(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching products with analysis:', queryAnalysis);
    
    let query = supabase
      .from('products')
      .select(`
        *,
        brands:brand_id(name, logo_url)
      `)
      .limit(10);

    // Apply brand filter if specified
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter to products:', queryAnalysis.brandFilter);
      query = query.eq('brands.name', queryAnalysis.brandFilter);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Product search error:', error);
      return [];
    }

    if (!products || products.length === 0) {
      console.log('No products found');
      return [];
    }

    console.log(`Found ${products.length} products`);

    return products.map(product => 
      `${product.brands?.name || 'Unknown Brand'} - ${product.name}`
    );

  } catch (error) {
    console.error('Product search error:', error);
    return [];
  }
}

// Search brands database
async function searchBrands(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching brands with analysis:', queryAnalysis);
    
    let query = supabase
      .from('brands')
      .select('*')
      .limit(10);

    // Apply brand filter if specified
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter to brands search:', queryAnalysis.brandFilter);
      query = query.ilike('name', `%${queryAnalysis.brandFilter}%`);
    }

    const { data: brands, error } = await query;

    if (error) {
      console.error('Brand search error:', error);
      return [];
    }

    if (!brands || brands.length === 0) {
      console.log('No brands found');
      return [];
    }

    console.log(`Found ${brands.length} brands`);

    return brands.map(brand => 
      `Brand: ${brand.name}${brand.description ? ` - ${brand.description}` : ''}`
    );

  } catch (error) {
    console.error('Brand search error:', error);
    return [];
  }
}

// ENHANCED: Search Drive files with improved brand filtering and document searching
async function searchDriveFiles(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching drive files with analysis:', queryAnalysis);
    
    let query = supabase
      .from('drive_files')
      .select('*')
      .limit(20);

    // Apply brand filter if specified - search in both file_name and brand columns
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter to drive files:', queryAnalysis.brandFilter);
      query = query.or(`file_name.ilike.%${queryAnalysis.brandFilter}%,brand.ilike.%${queryAnalysis.brandFilter}%`);
    } else if (queryAnalysis.isDocumentQuery) {
      // For document queries without specific brand, search for common document terms
      const docTerms = ['brochure', 'sales', 'sheet', 'spec', 'catalog', 'flyer', 'marketing'];
      const orConditions = docTerms.map(term => `file_name.ilike.%${term}%`).join(',');
      query = query.or(orConditions);
    }

    const { data: files, error } = await query;

    if (error) {
      console.error('Drive files search error:', error);
      return [];
    }

    if (!files || files.length === 0) {
      console.log('No drive files found');
      return [];
    }

    console.log(`Found ${files.length} drive files`);

    return files.map(file => 
      `Document: ${file.file_name}${file.brand ? ` (${file.brand})` : ''} - ${file.file_url || 'No link available'}`
    );

  } catch (error) {
    console.error('Drive files search error:', error);
    return [];
  }
}
