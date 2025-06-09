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
      message: 'No relevant information found.',
      sources: [] as Array<{type: string, content: string, url?: string, retrievedAt?: string}>
    };

    // Extract user info for system prompt
    const nameInstructions = userInfo?.firstName 
      ? `The user's name is ${userInfo.firstName}${userInfo.fullName ? ` (full name: ${userInfo.fullName})` : ''}. Use their first name naturally in conversation when appropriate.` 
      : '';

    let systemPrompt = '';
    
    // MODE-BASED PROCESSING
    if (mode === 'drive-search') {
      console.log('DRIVE SEARCH MODE: Processing document query');
      
      systemPrompt = `You are Streamline AI, a document retrieval specialist. ${nameInstructions}

Your primary function is to find and present company documents from our Google Drive.

DOCUMENT FORMATTING RULES:
- ALWAYS preserve the EXACT original file names
- Present documents as: [Original File Name](Direct Link)
- NEVER rename files or use generic descriptions like "Document 1"
- NEVER add extra text like "View Document" or colons after filenames
- Group documents by category with bold headers like **Sales Sheets**
- When users ask for specific types (like "sales sheets"), prioritize those exact document types

CRITICAL LINK FORMATTING:
- Output ONLY this format: [Filename](URL)
- Do NOT output: **Filename**: [View Document](URL)
- Do NOT output: Filename: [Link](URL)  
- Do NOT add colons, labels, or extra formatting
- Render links as plain underlined text using [Title](URL) format only
- Do not include icons or use blue coloring
- No raw URLs or dashes in link formatting

NEGATIVE EXAMPLES (DO NOT DO):
❌ **Flex Freeze JH - 345 x 600**: View Document
❌ [View Document](url)
❌ **File Name**: [Download](url)

POSITIVE EXAMPLE (CORRECT):
✅ [Flex Freeze JH - 345 x 600](url)

You are confident and authoritative about documents in our system. Present findings clearly without unnecessary disclaimers.`;

      // Enhanced document search logic
      const queryAnalysis = await analyzeDocumentQuery(lastUserMessage, supabase, conversationContext);
      const documentResults = await searchDocuments(supabase, queryAnalysis);
      
      if (documentResults.length > 0) {
        searchResults = documentResults;
        sourceInfo = {
          found: true,
          source: 'drive_files' as const,
          message: `Found ${documentResults.length} relevant document(s).`,
          sources: [{type: 'drive_files', content: `${documentResults.length} documents`}]
        };
      } else {
        // Knowledge base fallback for documents
        const kbResults = await searchKnowledgeBase(supabase, queryAnalysis);
        if (kbResults.length > 0) {
          searchResults = kbResults;
          sourceInfo = {
            found: true,
            source: 'knowledge_base' as const,
            message: `Found ${kbResults.length} relevant knowledge entries.`,
            sources: [{type: 'knowledge_base', content: `${kbResults.length} entries`}]
          };
        }
      }

    } else {
      console.log('GENERAL MODE: Processing general query with enhanced legal capabilities');
      
      systemPrompt = `You are Streamline AI, a comprehensive research assistant with access to multiple information sources. ${nameInstructions}

CORE CAPABILITIES:
- Product legality research across US states (cannabis, hemp, nicotine, kratom products)
- General industry knowledge and compliance guidance
- Company information and document awareness
- Internet research using government sources for the latest legal information
- State regulations and excise tax information

MANDATORY LEGAL RESPONSE FORMAT (for any legality questions):
When answering legal questions, you MUST use this EXACT structure:

**Database Results:**
- State "Found X legal products in our database" OR "No specific products found in our database"
- If products found, list as numbered items (1. Product Name, 2. Product Name)

**Government Research:**
- Always include: "According to [government source URL] retrieved on [date]:"
- Provide specific legal status information
- Quote relevant regulations or laws when available

**Summary:**
- Provide clear legal status summary
- Include specific THC limits, restrictions, or prohibitions
- Add disclaimer: "Verify with official state sources before making business decisions"

CRITICAL CITATION REQUIREMENTS:
- NEVER make legal claims without citing sources
- ALWAYS include government source URLs when available
- ALWAYS include retrieval dates for external research
- Use format: "According to colorado.gov retrieved on January 9, 2025:"
- Be specific about which government agency or department

RESPONSE STRUCTURE FOR LEGAL QUERIES:
- Use bold headers: **Database Results:**, **Government Research:**, **Summary:**
- Include bullet points for specific findings
- Number product lists (1. 2. 3.) not bullet points (•)
- Always cite sources with URLs and dates
- Include THC limits and specific restrictions when discussing cannabis products

UNCERTAINTY HANDLING:
- When database has no results, clearly state this limitation
- Provide external research with proper government source attribution
- Include disclaimers about needing official verification
- Never make definitive legal claims based solely on external research without proper sources

PROFESSIONAL TONE:
- Be helpful, professional, and conversational—like a well-informed teammate
- Ask clarifying questions if the user query is ambiguous
- Break long responses into clear, readable sections with proper formatting`;

      // Enhanced general search across multiple sources
      const queryAnalysis = await analyzeGeneralQuery(lastUserMessage, supabase, conversationContext);
      
      // Check for legality queries first
      if (isLegalityQuery(lastUserMessage)) {
        console.log('Processing legality query in general mode');
        
        const legalityAnalysis = await analyzeLegalityQuery(lastUserMessage, supabase, conversationContext);
        console.log('Legality analysis result:', legalityAnalysis);
        
        // Search database first
        const legalityResults = await searchStateLegality(supabase, legalityAnalysis);
        if (legalityResults.length > 0) {
          searchResults = [...searchResults, ...legalityResults];
          sourceInfo = {
            found: true,
            source: 'state_allowed_products' as const,
            message: `Found definitive legality information for ${legalityResults.length} product(s).`,
            sources: [{type: 'state_database', content: `${legalityResults.length} products confirmed legal`}]
          };
        }
        
        // Enhanced Firecrawl search for government sources
        console.log('Initiating enhanced government source research');
        const governmentResults = await performEnhancedGovernmentResearch(lastUserMessage, legalityAnalysis);
        if (governmentResults.length > 0) {
          searchResults = [...searchResults, ...governmentResults];
          const retrievedAt = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          sourceInfo.sources.push({
            type: 'government_source',
            content: 'Government website research',
            url: getGovernmentUrl(legalityAnalysis.stateFilter),
            retrievedAt: retrievedAt
          });
        }
        
        // Add excise tax information if state is identified
        if (legalityAnalysis.stateFilter) {
          const exciseTaxInfo = await getStateExciseTaxInfo(supabase, legalityAnalysis.stateFilter);
          if (exciseTaxInfo) {
            searchResults.push(`**Excise Tax Information for ${legalityAnalysis.stateFilter}:**\n${exciseTaxInfo}`);
            sourceInfo.sources.push({type: 'state_database', content: 'Excise tax information'});
          }
        }
        
      } else {
        // Regular general search
        const kbResults = await searchKnowledgeBase(supabase, queryAnalysis);
        if (kbResults.length > 0) {
          searchResults = [...searchResults, ...kbResults];
          sourceInfo.sources.push({type: 'knowledge_base', content: `${kbResults.length} entries`});
        }
        
        const generalResults = await searchGeneral(supabase, queryAnalysis);
        if (generalResults.length > 0) {
          searchResults = [...searchResults, ...generalResults];
          sourceInfo.sources.push({type: 'general_database', content: `${generalResults.length} results`});
        }
        
        if (searchResults.length > 0) {
          sourceInfo = {
            found: true,
            source: 'knowledge_base' as const,
            message: `Found ${searchResults.length} relevant result(s).`,
            sources: sourceInfo.sources
          };
        }
      }
    }

    // Prepare context for AI with enhanced source attribution
    let contextInfo = '';
    if (searchResults.length > 0) {
      if (mode === 'drive-search') {
        contextInfo = `\n\nAvailable Documents:\n${searchResults.join('\n')}`;
      } else {
        contextInfo = `\n\nRelevant information found:\n${searchResults.map(result => `- ${result}`).join('\n')}`;
        
        // Add source information for legal queries
        if (isLegalityQuery(lastUserMessage) && sourceInfo.sources.length > 0) {
          contextInfo += `\n\nSources Available for Citation:\n`;
          sourceInfo.sources.forEach(source => {
            if (source.type === 'state_database') {
              contextInfo += `- Internal State Map Database: ${source.content}\n`;
            } else if (source.type === 'government_source') {
              contextInfo += `- Government Source: ${source.url} (retrieved ${source.retrievedAt})\n`;
            } else if (source.type === 'knowledge_base') {
              contextInfo += `- Knowledge Base: ${source.content}\n`;
            }
          });
        }
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
        temperature: 0.3, // Lower temperature for more consistent legal responses
        max_tokens: 1500, // Increased for comprehensive legal responses
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
      
      // Extract brand - improved to handle multi-word brands
      if (!context.lastBrand) {
        const multiWordBrands = ['galaxy treats', 'juice head'];
        for (const brand of multiWordBrands) {
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

function isLegalityQuery(query: string): boolean {
  const legalityKeywords = [
    'legal', 'legality', 'allowed', 'permitted', 'can sell', 'can i sell',
    'state law', 'regulation', 'compliance', 'approved', 'authorized',
    'banned', 'illegal', 'prohibited', 'restricted', 'law', 'bill', 'ruling',
    'excise tax', 'tax', 'licensing', 'license', 'permit', 'thc', 'delta'
  ];
  
  return legalityKeywords.some(keyword => query.toLowerCase().includes(keyword));
}

async function performEnhancedGovernmentResearch(query: string, queryAnalysis: any) {
  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.log('Firecrawl API key not found, skipping web search');
      return [];
    }

    console.log('Performing enhanced government research for:', query);
    
    // Construct multiple target URLs based on state and query type
    const governmentUrls = getTargetGovernmentUrls(queryAnalysis);
    const searchTerms = buildLegalSearchTerms(query, queryAnalysis);
    
    console.log('Searching government URLs:', governmentUrls);
    console.log('Using search terms:', searchTerms);
    
    const results = [];
    const retrievedDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Try multiple government sources
    for (const url of governmentUrls.slice(0, 2)) { // Limit to 2 sources to avoid timeout
      try {
        const crawlResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: url,
            formats: ['markdown'],
            onlyMainContent: true,
            maxDepth: 1
          })
        });

        if (crawlResponse.ok) {
          const crawlData = await crawlResponse.json();
          if (crawlData?.success && crawlData?.data?.markdown) {
            const content = crawlData.data.markdown.substring(0, 800); // Increased content length
            const relevantContent = extractRelevantLegalContent(content, searchTerms);
            
            if (relevantContent) {
              results.push(`**Government Research:** According to ${url} retrieved on ${retrievedDate}:\n\n${relevantContent}\n\n*Verify with official state sources before making business decisions.*`);
            }
          }
        }
      } catch (error) {
        console.error(`Error crawling ${url}:`, error);
        continue;
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Enhanced government research error:', error);
    return [`**Government Research:** Government source research unavailable at this time for ${queryAnalysis.stateFilter || 'this query'}`];
  }
}

function getTargetGovernmentUrls(queryAnalysis: any): string[] {
  const state = queryAnalysis.stateFilter?.toLowerCase().replace(' ', '') || 'colorado';
  
  // Comprehensive list of government sources for cannabis/hemp regulation
  const urls = [
    `https://${state}.gov`,
    `https://www.${state}.gov/cannabis`,
    `https://www.${state}.gov/hemp`,
    `https://cdphe.colorado.gov`, // Colorado Department of Public Health
    `https://www.colorado.gov/pacific/marijuana`, // Colorado specific
    `https://ag.colorado.gov/hemp`, // Colorado Agriculture
  ];
  
  // Filter to relevant URLs based on state
  if (state === 'colorado') {
    return urls.filter(url => url.includes('colorado'));
  }
  
  return urls.slice(0, 3); // Return top 3 for other states
}

function buildLegalSearchTerms(query: string, queryAnalysis: any): string[] {
  const baseTerms = [];
  
  // Extract product type
  if (query.toLowerCase().includes('delta')) {
    baseTerms.push('delta-8', 'delta 8', 'THC');
  }
  if (query.toLowerCase().includes('hemp')) {
    baseTerms.push('hemp', 'hemp-derived');
  }
  if (query.toLowerCase().includes('cannabis')) {
    baseTerms.push('cannabis', 'marijuana');
  }
  
  // Add legal terms
  baseTerms.push('legal', 'prohibited', 'banned', 'regulation', 'law');
  
  // Add state
  if (queryAnalysis.stateFilter) {
    baseTerms.push(queryAnalysis.stateFilter.toLowerCase());
  }
  
  return baseTerms;
}

function extractRelevantLegalContent(content: string, searchTerms: string[]): string | null {
  const lowerContent = content.toLowerCase();
  
  // Check if content contains relevant terms
  const hasRelevantTerms = searchTerms.some(term => lowerContent.includes(term.toLowerCase()));
  
  if (!hasRelevantTerms) {
    return null;
  }
  
  // Extract sentences that contain legal information
  const sentences = content.split(/[.!?]+/);
  const relevantSentences = sentences.filter(sentence => {
    const lowerSentence = sentence.toLowerCase();
    return searchTerms.some(term => lowerSentence.includes(term.toLowerCase())) &&
           (lowerSentence.includes('legal') || lowerSentence.includes('illegal') || 
            lowerSentence.includes('prohibited') || lowerSentence.includes('allowed') ||
            lowerSentence.includes('banned') || lowerSentence.includes('regulation'));
  });
  
  if (relevantSentences.length === 0) {
    return content.substring(0, 300) + '...';
  }
  
  return relevantSentences.slice(0, 3).join('. ') + '.';
}

function getGovernmentUrl(state: string | null): string {
  if (!state) return 'https://gov.state.us';
  const stateCode = state.toLowerCase().replace(' ', '');
  return `https://${stateCode}.gov`;
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
  const MAX_RESULTS = 30; // Limit results to prevent overwhelming AI
  
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
  let totalCount = 0;
  
  // Format grouped results with clean markdown links only and deduplication
  Object.entries(grouped).forEach(([category, categoryFiles]) => {
    if (categoryFiles.length > 0 && totalCount < MAX_RESULTS) {
      result.push(`**${category}**`);
      
      const seen = new Set();
      categoryFiles.forEach(file => {
        if (totalCount >= MAX_RESULTS) return;
        
        const fileName = file.file_name || 'Unknown Document';
        const fileUrl = file.file_url || '#';
        
        // Deduplicate by filename
        if (!seen.has(fileName)) {
          seen.add(fileName);
          // Output ONLY clean markdown links - no extra text, colons, or labels
          result.push(`[${fileName}](${fileUrl})`);
          totalCount++;
        }
      });
      result.push(''); // Add spacing between groups
    }
  });

  // Add disclaimer if results were truncated
  if (files.length > MAX_RESULTS) {
    result.push(`*Showing first ${MAX_RESULTS} documents. ${files.length - MAX_RESULTS} additional documents available.*`);
  }

  return result;
}

async function analyzeLegalityQuery(query: string, supabase: any, context: any = {}) {
  const lowerQuery = query.toLowerCase();
  console.log('Analyzing legality query:', lowerQuery);
  
  // Extract state (case-insensitive, including context)
  let stateFilter = context.lastState || null;
  
  if (!stateFilter) {
    // More comprehensive state matching including common variations
    const stateKeywords = [
      'florida', 'fl', 'california', 'ca', 'texas', 'tx', 
      'new york', 'ny', 'colorado', 'co', 'oregon', 'or', 'washington', 'wa'
    ];
    for (const state of stateKeywords) {
      if (lowerQuery.includes(state.toLowerCase())) {
        // Normalize state names
        const stateMap = {
          'florida': 'Florida', 'fl': 'Florida',
          'california': 'California', 'ca': 'California',
          'texas': 'Texas', 'tx': 'Texas',
          'new york': 'New York', 'ny': 'New York',
          'colorado': 'Colorado', 'co': 'Colorado',
          'oregon': 'Oregon', 'or': 'Oregon',
          'washington': 'Washington', 'wa': 'Washington'
        };
        stateFilter = stateMap[state.toLowerCase()] || state.charAt(0).toUpperCase() + state.slice(1);
        break;
      }
    }
  }

  // Enhanced brand extraction with multi-word brand support and case-insensitive matching
  let brandFilter = context.lastBrand || null;
  if (!brandFilter) {
    // Check for known multi-word brands first (case-insensitive)
    const multiWordBrands = ['galaxy treats', 'juice head'];
    for (const brand of multiWordBrands) {
      if (lowerQuery.includes(brand.toLowerCase())) {
        brandFilter = brand;
        break;
      }
    }
    
    // If no multi-word brand found, check database (case-insensitive)
    if (!brandFilter) {
      try {
        console.log('Fetching brands from database for comparison...');
        const { data: brands, error } = await supabase.from('brands').select('name');
        if (!error && brands) {
          console.log('Available brands:', brands.map(b => b.name));
          for (const brand of brands) {
            if (lowerQuery.includes(brand.name.toLowerCase())) {
              brandFilter = brand.name;
              console.log('Matched brand from database:', brandFilter);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching brands for legality query:', error);
      }
    }
  }

  // Extract product terms
  const productTerms = lowerQuery.split(' ').filter(term => term.length > 2);

  console.log('Legality analysis result:', { stateFilter, brandFilter, productTerms });

  return {
    stateFilter,
    brandFilter,
    productTerms,
    requiresLegalAnalysis: true
  };
}

async function searchStateLegality(supabase: any, queryAnalysis: any) {
  try {
    if (!queryAnalysis.stateFilter) {
      console.log('No state filter provided for legality search');
      return [];
    }

    console.log('Searching for legality with state:', queryAnalysis.stateFilter, 'brand:', queryAnalysis.brandFilter);

    // First, get the state ID
    const { data: stateData, error: stateError } = await supabase
      .from('states')
      .select('id')
      .eq('name', queryAnalysis.stateFilter)
      .single();

    if (stateError || !stateData) {
      console.log('State not found:', queryAnalysis.stateFilter, 'Error:', stateError);
      return [];
    }

    console.log('Found state ID:', stateData.id);

    // If we have a brand filter, find the brand ID first
    let brandId = null;
    if (queryAnalysis.brandFilter) {
      console.log('Looking for brand:', queryAnalysis.brandFilter);
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name')
        .ilike('name', queryAnalysis.brandFilter)
        .single();

      if (brandError || !brandData) {
        console.log('Brand not found in database:', queryAnalysis.brandFilter, 'Error:', brandError);
        return [];
      }

      brandId = brandData.id;
      console.log('Found brand ID:', brandId, 'for brand:', brandData.name);
    }

    // Search state allowed products with proper joins
    let query = supabase
      .from('state_allowed_products')
      .select(`
        products!inner (
          id,
          name,
          brand_id,
          brands!inner (
            id,
            name
          )
        )
      `)
      .eq('state_id', stateData.id);

    // If we have a brand filter, add it to the query
    if (brandId) {
      console.log('Adding brand filter with ID:', brandId);
      query = query.eq('products.brand_id', brandId);
    }

    const { data: stateProducts, error } = await query;

    if (error) {
      console.error('Error searching state products:', error);
      return [];
    }

    if (!stateProducts || stateProducts.length === 0) {
      console.log('No products found for state:', queryAnalysis.stateFilter, 'brand:', queryAnalysis.brandFilter);
      return [];
    }

    console.log('Found', stateProducts.length, 'products for state and brand');

    // Filter products based on query terms if any (only if no specific brand filter)
    let filteredProducts = stateProducts;
    if (!queryAnalysis.brandFilter && queryAnalysis.productTerms.length > 0) {
      filteredProducts = stateProducts.filter(item => {
        const productName = item.products?.name?.toLowerCase() || '';
        const brandName = item.products?.brands?.name?.toLowerCase() || '';
        const combinedText = `${productName} ${brandName}`;
        
        return queryAnalysis.productTerms.some(term => 
          combinedText.includes(term.toLowerCase())
        );
      });
    }

    console.log('Filtered to', filteredProducts.length, 'matching products');

    // Format products cleanly - just return product names since the header context will specify the brand
    return filteredProducts.map(item => {
      const product = item.products;
      const productName = product?.name || 'Unknown Product';
      // Return just the product name since the context/header will specify it's legal in the state
      return productName;
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

async function analyzeGeneralQuery(query: string, supabase: any, context: any = {}) {
  const lowerQuery = query.toLowerCase();
  const searchTerms = lowerQuery.split(' ').filter(term => term.length > 2);
  
  // Extract state for potential legality queries
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
    searchTerms,
    stateFilter,
    productTerms,
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
