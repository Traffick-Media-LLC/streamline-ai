
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
    
    // Extract conversation context
    const conversationContext = extractConversationContext(messages);
    
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
- Present documents as: [Original File Name](Direct Link)
- NEVER rename files or use generic descriptions like "Document 1"
- Group documents by category with bold headers like **Sales Sheets**
- When users ask for specific types (like "sales sheets"), prioritize those exact document types

LINK STYLE REQUIREMENTS:
- Render links as plain underlined text using [Title](URL) format only
- Do not include icons or use blue coloring
- Do not add "Download" labels or extra bullets
- No raw URLs or dashes in link formatting

You are confident and authoritative about documents in our system. Present findings clearly without unnecessary disclaimers.`;

      // Enhanced document search logic
      const queryAnalysis = await analyzeDocumentQuery(lastUserMessage, supabase, conversationContext);
      const documentResults = await searchDocuments(supabase, queryAnalysis);
      
      if (documentResults.length > 0) {
        searchResults = documentResults;
        sourceInfo = {
          found: true,
          source: 'drive_files' as const,
          message: `Found ${documentResults.length} relevant document(s).`
        };
      } else {
        // Knowledge base fallback for documents
        const kbResults = await searchKnowledgeBase(supabase, queryAnalysis);
        if (kbResults.length > 0) {
          searchResults = kbResults;
          sourceInfo = {
            found: true,
            source: 'knowledge_base' as const,
            message: `Found ${kbResults.length} relevant knowledge entries.`
          };
        }
      }

    } else if (mode === 'product-legality') {
      console.log('PRODUCT LEGALITY MODE: Processing legality query');
      
      systemPrompt = `You are Streamline AI, a US regulatory compliance specialist. ${nameInstructions}

Your expertise covers regulatory compliance for multiple product categories across US states:

PRODUCT CATEGORIES:
- Cannabis and Hemp Products (flower, concentrates, edibles, topicals, etc.)
- Consumable Hemp Products (CBD, Delta-8, Delta-9, HHC, etc.)
- Nicotine Products (disposable vapes, pods, e-liquids, salts, pouches, etc.)
- Kratom Products (including 7-hydroxymitragynine products)

LEGALITY RESPONSE RULES:
- When products are found in our state_allowed_products database, they are DEFINITIVELY legal
- State this confidently: "Yes, [product] is legal in [state]" or "No, [product] is not legal in [state]"
- Include state excise tax information when available
- Only add compliance disclaimers when you lack specific data
- Products in our database have undergone due diligence - trust this data
- Consider federal vs state regulations when relevant

LINK FORMATTING:
- Use [Title](URL) format for any government or legal references
- No raw URLs or dash formatting

Provide clear, confident yes/no answers when you have the data for any of these product categories across US states.`;

      // Enhanced legality search logic
      const queryAnalysis = await analyzeLegalityQuery(lastUserMessage, supabase, conversationContext);
      const legalityResults = await searchStateLegality(supabase, queryAnalysis);
      
      if (legalityResults.length > 0) {
        searchResults = legalityResults;
        sourceInfo = {
          found: true,
          source: 'state_allowed_products' as const,
          message: `Found definitive legality information for ${legalityResults.length} product(s).`
        };
      }

      // Add excise tax information if state is identified
      if (queryAnalysis.stateFilter) {
        const exciseTaxInfo = await getStateExciseTaxInfo(supabase, queryAnalysis.stateFilter);
        if (exciseTaxInfo) {
          searchResults.push(`**Excise Tax Information for ${queryAnalysis.stateFilter}:**\n${exciseTaxInfo}`);
        }
      }

      // Enhanced legal analysis with Firecrawl for complex queries
      if (shouldUseLegalCrawling(lastUserMessage) && queryAnalysis.stateFilter) {
        console.log('Using enhanced legal analysis with government sources');
        // Note: Firecrawl integration would be implemented here
        // For now, we add a note about complex legal analysis
        searchResults.push("**Legal Analysis Note:** For detailed regulatory information, please consult official state government sources.");
      }

    } else {
      console.log('GENERAL MODE: Processing general query');
      
      systemPrompt = `You are Streamline AI, a knowledgeable assistant specializing in regulatory compliance and industry information. ${nameInstructions}

Your functions include:
- Answering general questions about cannabis, hemp, nicotine, and kratom industries using our knowledge base
- Providing company information and guidance
- Offering general compliance and regulatory guidance for US markets
- Context-aware responses based on conversation history

FORMATTING:
- Use **Bold Text** for headers and emphasis
- Format links as [Title](URL) - never use raw URLs or dashes
- Format responses clearly and professionally
- Provide helpful, accurate information based on your knowledge

CONTEXT AWARENESS:
- Remember previous mentions of states, brands, or products in the conversation
- Provide relevant follow-up information when appropriate

Be helpful, professional, and accurate in your responses across all regulated product categories.`;

      // Enhanced general search across multiple sources
      const queryAnalysis = await analyzeGeneralQuery(lastUserMessage, supabase, conversationContext);
      
      // Search knowledge base first
      const kbResults = await searchKnowledgeBase(supabase, queryAnalysis);
      if (kbResults.length > 0) {
        searchResults = [...searchResults, ...kbResults];
      }
      
      // Search products database
      const generalResults = await searchGeneral(supabase, queryAnalysis);
      if (generalResults.length > 0) {
        searchResults = [...searchResults, ...generalResults];
      }
      
      if (searchResults.length > 0) {
        sourceInfo = {
          found: true,
          source: 'knowledge_base' as const,
          message: `Found ${searchResults.length} relevant result(s).`
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

    // Apply enhanced cleanup to the response
    const cleanedResponse = applyEnhancedComprehensiveFormatCleanup(aiResponse);

    return new Response(JSON.stringify({
      response: cleanedResponse,
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

// ENHANCED UTILITY FUNCTIONS

function extractConversationContext(messages: any[]) {
  const context = {
    lastState: null,
    lastBrand: null,
    lastProduct: null
  };

  // Look through recent messages for context
  const recentMessages = messages.slice(-5).reverse();
  
  for (const message of recentMessages) {
    if (message.role === 'user') {
      const content = message.content.toLowerCase();
      
      // Extract state
      if (!context.lastState) {
        const stateKeywords = ['florida', 'california', 'texas', 'new york', 'colorado', 'oregon', 'washington'];
        for (const state of stateKeywords) {
          if (content.includes(state)) {
            context.lastState = state.charAt(0).toUpperCase() + state.slice(1);
            break;
          }
        }
      }
      
      // Extract brand
      if (!context.lastBrand) {
        const brandKeywords = ['juice head', 'orbital', 'kush', 'cookies'];
        for (const brand of brandKeywords) {
          if (content.includes(brand)) {
            context.lastBrand = brand;
            break;
          }
        }
      }
    }
  }
  
  return context;
}

function applyEnhancedComprehensiveFormatCleanup(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Fix markdown link formatting - ensure proper [text](url) format
  cleaned = cleaned.replace(/\*\*(.*?)\*\*\s*-\s*(https?:\/\/[^\s]+)/g, '[$1]($2)');
  
  // Clean up multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Fix spacing around headers
  cleaned = cleaned.replace(/\n(\*\*[^*]+\*\*)\n/g, '\n\n$1\n\n');
  
  // Ensure proper spacing after bullet points
  cleaned = cleaned.replace(/([•\-\*])\s*([^\n]+)\n(?!\s)/g, '$1 $2\n\n');
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  
  // Remove trailing whitespace from lines
  cleaned = cleaned.replace(/[ \t]+$/gm, '');
  
  return cleaned.trim();
}

function shouldUseLegalCrawling(query: string): boolean {
  const legalAnalysisKeywords = [
    'why banned', 'why illegal', 'law', 'bill', 'ruling', 'compliance',
    'regulation', 'statute', 'policy', 'legal explanation'
  ];
  
  return legalAnalysisKeywords.some(keyword => 
    query.toLowerCase().includes(keyword)
  );
}

// ENHANCED DOCUMENT SEARCH FUNCTIONS
async function analyzeDocumentQuery(query: string, supabase: any, context: any = {}) {
  const lowerQuery = query.toLowerCase();
  
  // Detect specific document types
  const isSalesSheetQuery = ['sales sheet', 'sales sheets', 'salessheet'].some(term => lowerQuery.includes(term));
  
  // Extract brand name (including context)
  let brandFilter = context.lastBrand || null;
  
  if (!brandFilter) {
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

    let query = supabase.from('drive_files').select('*').limit(50);

    // PRIORITIZE SALES SHEETS when specifically requested
    if (queryAnalysis.isSalesSheetQuery && queryAnalysis.brandFilter) {
      console.log('Searching for sales sheets for brand:', queryAnalysis.brandFilter);
      
      query = query
        .eq('brand', queryAnalysis.brandFilter)
        .or(`file_name.ilike.%Sales Sheet%,subcategory_2.eq.Sales Sheet`);
        
      const { data: salesSheets, error } = await query;
      
      if (!error && salesSheets && salesSheets.length > 0) {
        console.log(`Found ${salesSheets.length} sales sheets for ${queryAnalysis.brandFilter}`);
        return groupAndFormatDocuments(salesSheets);
      }
    }

    // Fallback: search by brand for any documents
    if (queryAnalysis.brandFilter) {
      query = supabase.from('drive_files').select('*').limit(50);
      query = query.eq('brand', queryAnalysis.brandFilter);
      
      const { data: files, error } = await query;
      if (!error && files && files.length > 0) {
        return groupAndFormatDocuments(files);
      }
    }

    return [];
  } catch (error) {
    console.error('Document search error:', error);
    return [];
  }
}

function groupAndFormatDocuments(files: any[]): string[] {
  // Group files by subcategory
  const grouped: { [key: string]: any[] } = {};
  
  files.forEach(file => {
    const category = file.subcategory_2 || file.category || 'Documents';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(file);
  });

  const result: string[] = [];
  
  // Format grouped results
  Object.entries(grouped).forEach(([category, categoryFiles]) => {
    if (categoryFiles.length > 0) {
      result.push(`**${category}**`);
      categoryFiles.forEach(file => {
        const fileName = file.file_name || 'Unknown Document';
        const fileUrl = file.file_url || '#';
        result.push(`[${fileName}](${fileUrl})`);
      });
      result.push(''); // Add spacing between groups
    }
  });

  return result;
}

// ENHANCED LEGALITY SEARCH FUNCTIONS
async function analyzeLegalityQuery(query: string, supabase: any, context: any = {}) {
  const lowerQuery = query.toLowerCase();
  
  // Extract state (including context)
  let stateFilter = context.lastState || null;
  
  if (!stateFilter) {
    const stateKeywords = ['florida', 'california', 'texas', 'new york', 'colorado', 'oregon', 'washington'];
    for (const state of stateKeywords) {
      if (lowerQuery.includes(state)) {
        stateFilter = state.charAt(0).toUpperCase() + state.slice(1);
        break;
      }
    }
  }

  // Extract product terms
  const productTerms = lowerQuery.split(' ').filter(term => term.length > 2);

  return {
    stateFilter,
    productTerms,
    requiresLegalAnalysis: shouldUseLegalCrawling(query)
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

async function getStateExciseTaxInfo(supabase: any, stateName: string) {
  try {
    const { data: exciseTax, error } = await supabase
      .from('state_excise_taxes')
      .select('excise_tax_info')
      .eq('states.name', stateName)
      .single();

    if (error || !exciseTax) return null;
    
    return exciseTax.excise_tax_info;
  } catch (error) {
    console.error('Error fetching excise tax info:', error);
    return null;
  }
}

// ENHANCED GENERAL SEARCH FUNCTIONS
async function analyzeGeneralQuery(query: string, supabase: any, context: any = {}) {
  const lowerQuery = query.toLowerCase();
  const searchTerms = lowerQuery.split(' ').filter(term => term.length > 2);
  
  return { 
    searchTerms,
    context: context
  };
}

async function searchKnowledgeBase(supabase: any, queryAnalysis: any) {
  try {
    const { data: entries, error } = await supabase
      .from('knowledge_entries')
      .select('title, content')
      .eq('is_active', true)
      .limit(10);

    if (error || !entries) return [];

    // Simple relevance filtering
    const relevant = entries.filter(entry => {
      const entryText = (entry.title + ' ' + entry.content).toLowerCase();
      return queryAnalysis.searchTerms.some(term => entryText.includes(term));
    });

    return relevant.map(entry => `**${entry.title}**\n${entry.content.substring(0, 200)}...`);

  } catch (error) {
    console.error('Knowledge base search error:', error);
    return [];
  }
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
