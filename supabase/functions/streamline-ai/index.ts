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

    // Enhanced system prompt with user personalization instructions
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

Always be helpful, professional, and accurate in your responses. When you don't have specific information, acknowledge this and suggest alternative resources or next steps.`;
    };

    const systemPrompt = createSystemPrompt(userInfo);

    // Get the last user message for analysis
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Analyze the query to determine search strategy
    const queryAnalysis = analyzeQuery(lastUserMessage);
    console.log('Query analysis:', queryAnalysis);

    let searchResults = [];
    let sourceInfo = {
      found: false,
      source: 'no_match' as const,
      message: 'No relevant information found.'
    };

    // Search strategy based on query type
    if (queryAnalysis.needsSearch) {
      try {
        // Search products database first if query seems product-related
        if (queryAnalysis.isProductQuery) {
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

        // Search brand database if query seems brand-related
        if (queryAnalysis.isBrandQuery) {
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

        // Search Drive files for documents and additional information
        if (queryAnalysis.isDocumentQuery || searchResults.length === 0) {
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

// Helper function to analyze user queries
function analyzeQuery(query: string) {
  const lowerQuery = query.toLowerCase();
  
  // Detect search intent
  const needsSearch = true; // Always search for now
  
  // Detect product-related queries
  const productKeywords = ['product', 'strain', 'flower', 'edible', 'vape', 'cartridge', 'concentrate', 'legal', 'legality', 'thc', 'cbd', 'mg'];
  const isProductQuery = productKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Detect brand-related queries  
  const brandKeywords = ['brand', 'company', 'manufacturer', 'producer'];
  const isBrandQuery = brandKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Detect document/file queries
  const documentKeywords = ['document', 'file', 'pdf', 'report', 'certificate', 'lab', 'test', 'coa', 'compliance'];
  const isDocumentQuery = documentKeywords.some(keyword => lowerQuery.includes(keyword));

  // Extract brand filter - only apply if explicitly mentioned
  let brandFilter = null;
  const brandMentionRegex = /(?:for|from|by|about)\s+([a-zA-Z][a-zA-Z\s&]+?)(?:\s|$|[,.!?])/i;
  const brandMatch = query.match(brandMentionRegex);
  if (brandMatch) {
    brandFilter = brandMatch[1].trim();
  }

  return {
    needsSearch,
    isProductQuery,
    isBrandQuery, 
    isDocumentQuery,
    brandFilter,
    searchTerms: lowerQuery.split(' ').filter(term => term.length > 2)
  };
}

// Search products database
async function searchProducts(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching products with analysis:', queryAnalysis);
    
    let query = supabase
      .from('products')
      .select(`
        *,
        brand:brands(name, logo_url)
      `)
      .limit(10);

    // Apply brand filter only if explicitly mentioned
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter:', queryAnalysis.brandFilter);
      query = query.ilike('brands.name', `%${queryAnalysis.brandFilter}%`);
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
      `Product: ${product.name} by ${product.brand?.name || 'Unknown'} - Type: ${product.type || 'Unknown'}, THC: ${product.thc_content || 'Unknown'}, CBD: ${product.cbd_content || 'Unknown'}`
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

    // Apply brand filter only if explicitly mentioned
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

// Search Drive files
async function searchDriveFiles(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching drive files with analysis:', queryAnalysis);
    
    let query = supabase
      .from('drive_files')
      .select('*')
      .limit(20);

    // Apply brand filter only if explicitly mentioned
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter to drive files:', queryAnalysis.brandFilter);
      query = query.or(`name.ilike.%${queryAnalysis.brandFilter}%,folder_name.ilike.%${queryAnalysis.brandFilter}%`);
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
      `Document: ${file.name}${file.folder_name ? ` (from ${file.folder_name})` : ''} - ${file.web_view_link || 'No link available'}`
    );

  } catch (error) {
    console.error('Drive files search error:', error);
    return [];
  }
}
