
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
    const { messages, chatId, userId, userInfo, mode } = await req.json();
    
    console.log('Received request:', { 
      messageCount: messages?.length, 
      chatId, 
      userId, 
      userInfo: userInfo ? `${userInfo.firstName} (${userInfo.email})` : 'No user info',
      mode: mode || 'no mode specified'
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

    // Get the last user message for processing
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    // Mode-based processing
    let searchResults = [];
    let sourceInfo = {
      found: false,
      source: 'no_match' as const,
      message: 'No relevant information found.'
    };

    // Extract user info for system prompt
    const nameInstructions = userInfo?.firstName 
      ? `The user's name is ${userInfo.firstName}${userInfo.fullName ? ` (full name: ${userInfo.fullName})` : ''}. Use their first name naturally in conversation when appropriate.` 
      : '';

    let systemPrompt = '';
    
    // MODE-BASED PROCESSING
    if (mode === 'document-search') {
      console.log('DOCUMENT SEARCH MODE: Processing document query');
      
      systemPrompt = `You are Streamline AI, a document retrieval specialist. ${nameInstructions}

Your primary function is to find and present company documents from our Google Drive.

DOCUMENT FORMATTING RULES:
- ALWAYS preserve the EXACT original file names
- Present documents as: **[Original File Name]** - [Direct Link]
- NEVER rename files or use generic descriptions like "Document 1"
- Provide Google Drive links for immediate access
- When users ask for specific types (like "sales sheets"), prioritize those exact document types

You are confident and authoritative about documents in our system. Present findings clearly without unnecessary disclaimers.`;

      // Document-specific search logic
      const queryAnalysis = await analyzeDocumentQuery(lastUserMessage, supabase);
      const documentResults = await searchDocuments(supabase, queryAnalysis);
      
      if (documentResults.length > 0) {
        searchResults = documentResults;
        sourceInfo = {
          found: true,
          source: 'drive_files' as const,
          message: `Found ${documentResults.length} relevant document(s).`
        };
      }

    } else if (mode === 'product-legality') {
      console.log('PRODUCT LEGALITY MODE: Processing legality query');
      
      systemPrompt = `You are Streamline AI, a cannabis compliance specialist. ${nameInstructions}

Your primary function is to provide definitive answers about product legality across different states.

LEGALITY RESPONSE RULES:
- When products are found in our state_allowed_products database, they are DEFINITIVELY legal
- State this confidently: "Yes, [product] is legal in [state]" or "No, [product] is not legal in [state]"
- Only add compliance disclaimers when you lack specific data
- Products in our database have undergone due diligence - trust this data

Provide clear, confident yes/no answers when you have the data.`;

      // Legality-specific search logic
      const queryAnalysis = await analyzeLegalityQuery(lastUserMessage, supabase);
      const legalityResults = await searchStateLegality(supabase, queryAnalysis);
      
      if (legalityResults.length > 0) {
        searchResults = legalityResults;
        sourceInfo = {
          found: true,
          source: 'state_allowed_products' as const,
          message: `Found definitive legality information for ${legalityResults.length} product(s).`
        };
      }

    } else {
      console.log('GENERAL MODE: Processing general query');
      
      systemPrompt = `You are Streamline AI, a knowledgeable assistant specializing in cannabis industry information. ${nameInstructions}

Your functions include:
- Answering general questions about the cannabis industry
- Providing company information and guidance
- Offering general compliance and regulatory guidance

FORMATTING:
- Use **Bold Text** for headers and emphasis
- Format responses clearly and professionally
- Provide helpful, accurate information based on your knowledge

Be helpful, professional, and accurate in your responses.`;

      // General search across multiple sources
      const queryAnalysis = await analyzeGeneralQuery(lastUserMessage, supabase);
      const generalResults = await searchGeneral(supabase, queryAnalysis);
      
      if (generalResults.length > 0) {
        searchResults = generalResults;
        sourceInfo = {
          found: true,
          source: 'product_database' as const,
          message: `Found ${generalResults.length} relevant result(s).`
        };
      }
    }

    // Prepare context for AI
    let contextInfo = '';
    if (searchResults.length > 0) {
      if (mode === 'document-search') {
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

    console.log('Calling OpenAI with messages:', aiMessages.length, 'Mode:', mode);

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

// DOCUMENT SEARCH FUNCTIONS
async function analyzeDocumentQuery(query: string, supabase: any) {
  const lowerQuery = query.toLowerCase();
  
  // Detect specific document types
  const isSalesSheetQuery = ['sales sheet', 'sales sheets', 'salessheet'].some(term => lowerQuery.includes(term));
  
  // Extract brand name
  let brandFilter = null;
  try {
    const { data: brands, error } = await supabase.from('brands').select('name');
    if (!error && brands) {
      for (const brand of brands) {
        if (lowerQuery.includes(brand.name.toLowerCase())) {
          brandFilter = brand.name;
          break;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching brands:', error);
  }

  return {
    isSalesSheetQuery,
    brandFilter,
    searchTerms: lowerQuery.split(' ').filter(term => term.length > 2)
  };
}

async function searchDocuments(supabase: any, queryAnalysis: any) {
  try {
    console.log('Document search with analysis:', queryAnalysis);

    let query = supabase.from('drive_files').select('*').limit(20);

    // PRIORITIZE SALES SHEETS when specifically requested
    if (queryAnalysis.isSalesSheetQuery && queryAnalysis.brandFilter) {
      console.log('Searching for sales sheets for brand:', queryAnalysis.brandFilter);
      
      // Search for files with "Sales Sheet" in name OR categorized as Sales Sheet
      query = query
        .eq('brand', queryAnalysis.brandFilter)
        .or(`file_name.ilike.%Sales Sheet%,subcategory_2.eq.Sales Sheet`);
        
      const { data: salesSheets, error } = await query;
      
      if (!error && salesSheets && salesSheets.length > 0) {
        console.log(`Found ${salesSheets.length} sales sheets for ${queryAnalysis.brandFilter}`);
        return salesSheets.map(file => {
          const fileName = file.file_name || 'Unknown Document';
          const fileUrl = file.file_url || '#';
          return `**${fileName}** - ${fileUrl}`;
        });
      }
    }

    // Fallback: search by brand for any documents
    if (queryAnalysis.brandFilter) {
      query = supabase.from('drive_files').select('*').limit(20);
      query = query.eq('brand', queryAnalysis.brandFilter);
      
      const { data: files, error } = await query;
      if (!error && files && files.length > 0) {
        return files.map(file => {
          const fileName = file.file_name || 'Unknown Document';
          const fileUrl = file.file_url || '#';
          return `**${fileName}** - ${fileUrl}`;
        });
      }
    }

    return [];
  } catch (error) {
    console.error('Document search error:', error);
    return [];
  }
}

// LEGALITY SEARCH FUNCTIONS
async function analyzeLegalityQuery(query: string, supabase: any) {
  const lowerQuery = query.toLowerCase();
  
  // Extract state
  let stateFilter = null;
  const stateKeywords = ['florida', 'california', 'texas', 'new york', 'colorado', 'oregon', 'washington'];
  for (const state of stateKeywords) {
    if (lowerQuery.includes(state)) {
      stateFilter = state.charAt(0).toUpperCase() + state.slice(1);
      break;
    }
  }

  // Extract product terms
  const productTerms = lowerQuery.split(' ').filter(term => term.length > 2);

  return {
    stateFilter,
    productTerms
  };
}

async function searchStateLegality(supabase: any, queryAnalysis: any) {
  try {
    if (!queryAnalysis.stateFilter) return [];

    // Search state allowed products
    const { data: stateProducts, error } = await supabase
      .from('state_allowed_products')
      .select(`
        products (name, brands (name))
      `)
      .eq('states.name', queryAnalysis.stateFilter);

    if (error || !stateProducts) return [];

    return stateProducts.map(item => {
      const product = item.products;
      const brand = product?.brands?.name || 'Unknown Brand';
      return `${product?.name || 'Unknown Product'} by ${brand} is legal in ${queryAnalysis.stateFilter}`;
    });

  } catch (error) {
    console.error('Legality search error:', error);
    return [];
  }
}

// GENERAL SEARCH FUNCTIONS
async function analyzeGeneralQuery(query: string, supabase: any) {
  const lowerQuery = query.toLowerCase();
  const searchTerms = lowerQuery.split(' ').filter(term => term.length > 2);
  
  return { searchTerms };
}

async function searchGeneral(supabase: any, queryAnalysis: any) {
  try {
    // Simple search across products and brands
    const { data: products, error } = await supabase
      .from('products')
      .select('name, brands (name)')
      .limit(10);

    if (error || !products) return [];

    return products.map(product => {
      const brand = product.brands?.name || 'Unknown Brand';
      return `${product.name} by ${brand}`;
    });

  } catch (error) {
    console.error('General search error:', error);
    return [];
  }
}
