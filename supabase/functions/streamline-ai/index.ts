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

DOCUMENT HANDLING INSTRUCTIONS:
- When presenting documents from our drive, preserve the EXACT original file names
- Present each document with its actual name and direct download link
- Use this format: "**[Original File Name]** - [Direct Link]"
- Do NOT create arbitrary numbering systems or rename files
- Do NOT use generic descriptions like "Document 1", "Sales Sheet A", etc.
- Always provide the actual Google Drive links for immediate access
- When users ask for specific document types (like "sales sheets"), prioritize files that match that exact type

CONFIDENCE GUIDELINES:
- When products are found in the state_allowed_products database, they are DEFINITIVELY legal - state this confidently without disclaimers
- Only add compliance disclaimers when you lack specific data or when dealing with general regulatory questions
- Products in our database have already undergone due diligence - trust this data
- When documents are found in our drive, present them as authoritative company materials

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

    // Search strategy based on query type - prioritize drive files for document queries
    if (queryAnalysis.needsSearch) {
      try {
        // PRIORITY 1: Search Drive files first for document queries (especially with brand filter)
        if (queryAnalysis.isDocumentQuery) {
          console.log('Document query detected, searching drive files...');
          const driveResults = await searchDriveFiles(supabase, queryAnalysis);
          if (driveResults.length > 0) {
            searchResults = driveResults;
            sourceInfo = {
              found: true,
              source: 'drive_files' as const,
              message: `Found ${driveResults.length} relevant document(s).`
            };
          }
        }

        // PRIORITY 2: Search state allowed products for definitive legality questions
        if (queryAnalysis.isLegalityQuery && queryAnalysis.stateFilter && searchResults.length === 0) {
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

        // PRIORITY 3: Search products database if query seems product-related and no results yet
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

        // PRIORITY 4: Search brand database if query seems brand-related and no results yet
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

        // FALLBACK: Search Drive files for any query if no other results found
        if (searchResults.length === 0 && !queryAnalysis.isDocumentQuery) {
          console.log('No results found, trying drive files as fallback...');
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
      if (sourceInfo.source === 'drive_files') {
        contextInfo = `\n\nAvailable Documents:\n${searchResults.join('\n')}`;
      } else {
        contextInfo = `\n\nRelevant information found:\n${searchResults.map(result => `- ${result}`).join('\n')}`;
      }
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

// Enhanced helper function to analyze user queries with improved sales sheet detection
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
  
  // ENHANCED: Detect document/file queries with sales sheet priority
  const documentKeywords = [
    'document', 'file', 'pdf', 'report', 'certificate', 'lab', 'test', 'coa', 'compliance',
    'brochure', 'brochures', 'sales', 'sheet', 'sheets', 'material', 'materials', 
    'marketing', 'flyer', 'flyers', 'catalog', 'spec', 'specs', 'datasheet',
    'sales sheet', 'sales sheets' // Added specific multi-word terms
  ];
  const isDocumentQuery = documentKeywords.some(keyword => lowerQuery.includes(keyword));

  // ENHANCED: Detect specific sales sheet requests
  const salesSheetKeywords = ['sales sheet', 'sales sheets', 'sales sheet', 'salessheet', 'salessheets'];
  const isSalesSheetQuery = salesSheetKeywords.some(keyword => lowerQuery.includes(keyword));

  console.log('Document query analysis:', {
    query: lowerQuery,
    isDocumentQuery,
    isSalesSheetQuery,
    matchedKeywords: documentKeywords.filter(keyword => lowerQuery.includes(keyword))
  });

  // Enhanced brand detection - check against actual brand names in database
  let brandFilter = null;
  
  try {
    // Get all brand names from database
    const { data: brands, error } = await supabase
      .from('brands')
      .select('name');
    
    if (!error && brands) {
      // Check for exact brand matches first (case insensitive)
      for (const brand of brands) {
        const brandName = brand.name.toLowerCase();
        
        // Direct brand name match (case insensitive)
        if (lowerQuery.includes(brandName)) {
          brandFilter = brand.name;
          console.log(`Found exact brand match: ${brand.name}`);
          break;
        }
      }
      
      // Special handling for common brand name variations if no exact match
      if (!brandFilter) {
        const brandVariations = {
          'juice head': 'Juice Head',
          'juicehead': 'Juice Head', 
          'mcro': 'MCRO',
          'galaxy treats': 'Galaxy Treats',
          'galazy treats': 'Galaxy Treats', // Common typo
        };
        
        for (const [variation, actualName] of Object.entries(brandVariations)) {
          if (lowerQuery.includes(variation)) {
            brandFilter = actualName;
            console.log(`Found brand variation match: ${variation} -> ${actualName}`);
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
    isSalesSheetQuery,
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
    isSalesSheetQuery,
    brandFilter,
    stateFilter,
    searchTerms: lowerQuery.split(' ').filter(term => term.length > 2)
  };
}

// ... keep existing code (searchStateAllowedProducts function)

// ... keep existing code (searchProducts function)

// ... keep existing code (searchBrands function)

// ENHANCED: Search Drive files with improved sales sheet prioritization
async function searchDriveFiles(supabase: any, queryAnalysis: any) {
  try {
    console.log('Searching drive files with analysis:', queryAnalysis);
    
    let query = supabase
      .from('drive_files')
      .select('*')
      .limit(20);

    // ENHANCED: Prioritize sales sheets when specifically requested
    if (queryAnalysis.isSalesSheetQuery && queryAnalysis.brandFilter) {
      console.log('Sales sheet query detected, prioritizing sales sheets for brand:', queryAnalysis.brandFilter);
      
      // First, try to find files with "Sales Sheet" in the name or category
      query = query
        .eq('brand', queryAnalysis.brandFilter)
        .or(`file_name.ilike.%Sales Sheet%,subcategory_2.eq.Sales Sheet`);
        
      const { data: salesSheetFiles, error: salesSheetError } = await query;
      
      if (!salesSheetError && salesSheetFiles && salesSheetFiles.length > 0) {
        console.log(`Found ${salesSheetFiles.length} sales sheet files for ${queryAnalysis.brandFilter}`);
        
        // Return formatted sales sheet results
        return salesSheetFiles.map(file => {
          const fileName = file.file_name || 'Unknown Document';
          const fileUrl = file.file_url || '#';
          const brandInfo = file.brand ? ` (${file.brand})` : '';
          
          return `**${fileName}**${brandInfo} - ${fileUrl}`;
        });
      }
    }

    // Reset query for fallback search if no sales sheets found
    query = supabase
      .from('drive_files')
      .select('*')
      .limit(20);

    // Apply brand filter if specified - search in both file_name and brand columns
    if (queryAnalysis.brandFilter) {
      console.log('Applying brand filter to drive files:', queryAnalysis.brandFilter);
      // Use exact match for brand column and contains match for file_name
      query = query.or(`brand.eq."${queryAnalysis.brandFilter}",file_name.ilike.%${queryAnalysis.brandFilter}%`);
    } else if (queryAnalysis.isDocumentQuery) {
      // For document queries without specific brand, search for common document terms
      const searchTerms = queryAnalysis.searchTerms.join(' ');
      console.log('Searching for document terms:', searchTerms);
      
      // Search in file_name for any of the search terms
      const conditions = queryAnalysis.searchTerms.map(term => `file_name.ilike.%${term}%`);
      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      }
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

    // Return structured format for documents that preserves original names and links
    return files.map(file => {
      const fileName = file.file_name || 'Unknown Document';
      const fileUrl = file.file_url || '#';
      const brandInfo = file.brand ? ` (${file.brand})` : '';
      
      // Format for AI to use: **FileName** - DirectLink
      return `**${fileName}**${brandInfo} - ${fileUrl}`;
    });

  } catch (error) {
    console.error('Drive files search error:', error);
    return [];
  }
}
