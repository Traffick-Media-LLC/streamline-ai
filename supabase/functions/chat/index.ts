import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions for logging
const startTimer = () => performance.now();
const calculateDuration = (startTime) => Math.round(performance.now() - startTime);

const logEvent = async (supabase, requestId, eventType, component, message, options = {}) => {
  try {
    const { 
      userId = null, 
      chatId = null, 
      durationMs = null, 
      metadata = null, 
      errorDetails = null,
      severity = 'info'
    } = options;
    
    // Log to console
    const logPrefix = `[${requestId}][${component}][${eventType}]`;
    if (severity === 'error' || severity === 'critical') {
      console.error(`${logPrefix} ${message}`, errorDetails || metadata || {});
    } else if (severity === 'warning') {
      console.warn(`${logPrefix} ${message}`, metadata || {});
    } else {
      console.log(`${logPrefix} ${message}`, metadata || {});
    }
    
    // Store in database
    if (supabase) {
      try {
        await supabase
          .from('chat_logs')
          .insert({
            request_id: requestId,
            user_id: userId,
            chat_id: chatId,
            event_type: eventType,
            component,
            message,
            duration_ms: durationMs,
            metadata,
            error_details: errorDetails,
            severity
          });
      } catch (dbError) {
        console.error("Failed to insert log to database:", dbError);
      }
    }
  } catch (e) {
    // Don't let logging failures break the main flow
    console.error("Error in logging system:", e);
  }
};

const logError = async (supabase, requestId, component, message, error, options = {}) => {
  try {
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    };
    
    await logEvent(supabase, requestId, 'error', component, message, {
      ...options,
      errorDetails,
      severity: options.severity || 'error'
    });
  } catch (e) {
    console.error("Error in error logging system:", e);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  // Initialize supabase client outside the try block so it's available in catch
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  let requestId = '';
  const mainStartTime = startTimer();
  
  try {
    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error("Failed to parse request JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid request format: " + jsonError.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const { content, messages, documentIds = [], documentContents = [], requestId: clientRequestId } = requestData;
    
    requestId = clientRequestId || `edge-${Date.now()}`;
    
    // Initial request log
    await logEvent(supabase, requestId, 'edge_request_started', 'chat_function', 'Chat function request received', {
      metadata: { 
        messageCount: messages?.length || 0,
        documentCount: documentIds?.length || 0,
        contentLength: content?.length || 0
      }
    });
    
    // Analyze the input to determine which sources to prioritize
    const analyzeStartTime = startTimer();
    let legalityQuery = false;
    let fileQuery = false;
    
    try {
      legalityQuery = isLegalityQuery(content);
      fileQuery = isFileQuery(content);
    } catch (analyzeError) {
      console.error("Error analyzing query:", analyzeError);
      // Default to false if analysis fails
    }
    
    await logEvent(supabase, requestId, 'query_analysis', 'chat_function', `Query analysis completed: Legality=${legalityQuery}, File=${fileQuery}`, {
      durationMs: calculateDuration(analyzeStartTime),
      metadata: { isLegalityQuery: legalityQuery, isFileQuery: fileQuery }
    });
    
    // Extract potential terms for database searches
    let searchTerms = [];
    try {
      searchTerms = extractSearchTerms(content);
    } catch (extractError) {
      console.error("Error extracting search terms:", extractError);
      searchTerms = [];
    }
    
    await logEvent(supabase, requestId, 'search_terms_extracted', 'chat_function', `Search terms extracted from query`, {
      metadata: { searchTerms }
    });
    
    let knowledgeContext = "";
    let referencedSources = [];
    
    // 1. LEGALITY CHECK: Check Supabase state permissions for product legality questions
    if (legalityQuery) {
      await logEvent(supabase, requestId, 'legality_check_started', 'chat_function', 'Processing legality query with state map data');
      
      const legalityStartTime = startTimer();
      const legalityData = await checkProductLegality(supabase, searchTerms, requestId);
      
      if (legalityData) {
        knowledgeContext += "State Legality Data:\n\n" + legalityData + "\n\n";
        referencedSources.push("State Map Database");
        
        await logEvent(supabase, requestId, 'legality_data_found', 'chat_function', 'Found legality data in state map database', {
          durationMs: calculateDuration(legalityStartTime),
          metadata: { dataLength: legalityData.length }
        });
      } else {
        await logEvent(supabase, requestId, 'legality_data_not_found', 'chat_function', 'No legality data found in state map database', {
          durationMs: calculateDuration(legalityStartTime)
        });
      }
    }
    
    // 2. KNOWLEDGE BASE: Extract brand, product, and regulatory information from Knowledge Base
    // Extract potential brand and product names from the query
    const knowledgeStartTime = startTimer();
    await logEvent(supabase, requestId, 'knowledge_search_started', 'chat_function', 'Querying knowledge base');
    
    let knowledgeEntries = await getRelevantKnowledgeEntries(supabase, searchTerms, content, requestId);
    
    if (knowledgeEntries.length > 0) {
      knowledgeContext += "Knowledge Base Information:\n\n" + knowledgeEntries.join("\n\n") + "\n\n";
      referencedSources.push("Knowledge Base");
      
      await logEvent(supabase, requestId, 'knowledge_entries_found', 'chat_function', `Found ${knowledgeEntries.length} relevant knowledge entries`, {
        durationMs: calculateDuration(knowledgeStartTime),
        metadata: { entryCount: knowledgeEntries.length }
      });
    } else {
      await logEvent(supabase, requestId, 'knowledge_entries_not_found', 'chat_function', 'No relevant knowledge entries found', {
        durationMs: calculateDuration(knowledgeStartTime)
      });
    }
    
    // 3. DOCUMENT SEARCH: Search Google Drive for documents if it's a file query
    // or if document IDs are explicitly provided
    let documentEntries = [];
    
    // Process explicitly provided document IDs
    if (documentIds && documentIds.length > 0) {
      await logEvent(supabase, requestId, 'process_provided_documents', 'chat_function', `Processing ${documentIds.length} provided document IDs`);
      
      // If document contents were passed from frontend, use them
      if (documentContents && documentContents.length > 0) {
        await logEvent(supabase, requestId, 'using_provided_document_contents', 'chat_function', `Using ${documentContents.length} pre-fetched document contents`);
        
        documentEntries = documentContents.map(doc => ({
          file_id: doc.id,
          title: `Document: ${doc.name}`,
          content: doc.content
        }));
        
        if (documentEntries.length > 0) {
          referencedSources.push("Selected Documents");
        }
      } 
      // Otherwise fetch document content
      else {
        const docStartTime = startTimer();
        documentEntries = await getDocumentContent(supabase, documentIds, requestId);
        
        if (documentEntries.length > 0) {
          referencedSources.push("Selected Documents");
          
          await logEvent(supabase, requestId, 'document_contents_fetched', 'chat_function', `Fetched ${documentEntries.length}/${documentIds.length} document contents`, {
            durationMs: calculateDuration(docStartTime),
            metadata: {
              successCount: documentEntries.length,
              totalRequested: documentIds.length
            }
          });
        } else {
          await logEvent(supabase, requestId, 'document_contents_not_found', 'chat_function', 'Failed to fetch document contents', {
            durationMs: calculateDuration(docStartTime),
            severity: 'warning'
          });
        }
      }
    } 
    // Or search for documents if it's a file query
    else if (fileQuery) {
      const searchStartTime = startTimer();
      await logEvent(supabase, requestId, 'document_search_started', 'chat_function', 'Searching for documents based on query');
      
      const documentSearchResults = await searchDocuments(supabase, searchTerms, requestId);
      
      if (documentSearchResults.length > 0) {
        await logEvent(supabase, requestId, 'document_search_results', 'chat_function', `Found ${documentSearchResults.length} documents in search`, {
          durationMs: calculateDuration(searchStartTime),
          metadata: { resultCount: documentSearchResults.length }
        });
        
        const contentStartTime = startTimer();
        documentEntries = await getDocumentContent(
          supabase, 
          documentSearchResults.slice(0, 3).map(doc => doc.id),
          requestId
        );
          
        if (documentEntries.length > 0) {
          referencedSources.push("Drive Search");
          
          await logEvent(supabase, requestId, 'document_content_fetched_from_search', 'chat_function', `Fetched content for ${documentEntries.length} documents from search results`, {
            durationMs: calculateDuration(contentStartTime)
          });
        } else {
          await logEvent(supabase, requestId, 'document_content_not_found_from_search', 'chat_function', 'Failed to fetch content for search results', {
            durationMs: calculateDuration(contentStartTime),
            severity: 'warning'
          });
        }
      } else {
        await logEvent(supabase, requestId, 'document_search_no_results', 'chat_function', 'No documents found matching search terms', {
          durationMs: calculateDuration(searchStartTime)
        });
      }
    }
    
    // Add document content to context
    if (documentEntries.length > 0) {
      knowledgeContext += "Document References:\n\n";
      documentEntries.forEach(doc => {
        knowledgeContext += `Document: ${doc.title.replace('Document: ', '')}\n`;
        knowledgeContext += `Content Extract:\n${doc.content.substring(0, 1500)}${doc.content.length > 1500 ? '...' : ''}\n\n`;
      });
      
      await logEvent(supabase, requestId, 'added_document_context', 'chat_function', `Added ${documentEntries.length} documents to context`, {
        metadata: {
          documentTitles: documentEntries.map(d => d.title.replace('Document: ', ''))
        }
      });
    }
    
    // Build the system prompt with the updated instructions
    await logEvent(supabase, requestId, 'building_system_prompt', 'chat_function', 'Building system prompt for AI');
    
    const baseSystemPrompt = `You are the AI assistant for Streamline Group Employees inside the Streamline Group Portal. 

Your role is to intelligently answer employee questions about product legality, information about Streamline Group's products, employee resources, and company documents.

Follow this strict source hierarchy based on the type of question:

1. If the user asks about product legality or regulatory status by state (e.g., "Is Delta-8 legal in Texas?"), you must check and pull from the Supabase backend database that powers the U.S. State Map.
2. If the user asks general questions about company information (e.g., "What brands does Streamline sell?" or "Where can I find the marketing request form?"), reference the AI Knowledge Base first.
3. If the user asks for specific files, images, logos, product renders, sales sheets, POS kits, or documents (e.g., "Can I download the Alcohol Armor sales sheet?" or "Where is the POS kit for Juice Head?"), then search and retrieve information from the Google Drive integration.

Understand the context of each question to determine which source to use:
- Never reference Google Drive for questions about product legality.
- Always use the Supabase backend for product legality first.
- Use the Knowledge Base for broader company questions.
- Use the Google Drive integration only for locating files and assets.

${referencedSources.length > 0 ? 
  `For this question, the following sources were referenced: ${referencedSources.join(', ')}.` : 
  'No specific sources were found for this question.'}

Always cite your sources where appropriate (e.g., 'According to the State Map data...' or 'This document is retrieved from the Streamline Group Drive').

Answer in a professional, clear, and helpful tone. If you cannot find an answer from the available sources, politely let the user know and suggest submitting a request via the Marketing Request Form or contacting the appropriate department.`;

    // Build the final system message with the knowledge context
    let systemContent = baseSystemPrompt;
    if (knowledgeContext) {
      systemContent += `\n\n${knowledgeContext}`;
    }
    
    systemContent += `\n\nMaintain a helpful and professional tone throughout the conversation.`;

    const conversationMessages = [
      { role: 'system', content: systemContent },
      ...messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content }
    ];

    await logEvent(supabase, requestId, 'calling_openai', 'chat_function', 'Calling OpenAI API', {
      metadata: { 
        modelName: 'gpt-4o',
        promptLength: systemContent.length,
        messageCount: conversationMessages.length
      }
    });
    
    const aiStartTime = startTimer();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error(`OpenAI API returned invalid response: ${JSON.stringify(data)}`);
    }
    
    const aiDuration = calculateDuration(aiStartTime);
    await logEvent(supabase, requestId, 'openai_response_received', 'chat_function', 'Received response from OpenAI API', {
      durationMs: aiDuration,
      metadata: { 
        responseLength: data.choices[0].message.content.length,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens
      }
    });
    
    // Extract document references from the message if any
    let referencedDocuments = [];
    if (documentEntries?.length > 0) {
      // Simple heuristic to find document references
      const assistantMessage = data.choices[0].message.content;
      documentEntries.forEach(doc => {
        const docName = doc.title.replace('Document: ', '');
        if (assistantMessage.includes(docName)) {
          referencedDocuments.push({
            id: doc.file_id,
            name: docName
          });
        }
      });
      
      await logEvent(supabase, requestId, 'document_references_extracted', 'chat_function', `Extracted ${referencedDocuments.length} document references from response`, {
        metadata: {
          referencedDocuments: referencedDocuments.map(d => d.name)
        }
      });
    }

    await logEvent(supabase, requestId, 'request_completed', 'chat_function', 'Chat function request completed successfully', {
      durationMs: calculateDuration(mainStartTime)
    });
    
    return new Response(
      JSON.stringify({ 
        message: data.choices[0].message.content,
        referencedDocuments
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const errorMessage = `Error in chat function: ${error.message || 'Unknown error'}`;
    await logError(supabase, requestId, 'chat_function', errorMessage, error, {
      severity: 'critical',
      durationMs: calculateDuration(mainStartTime)
    });
    
    return new Response(
      JSON.stringify({ error: 'Error processing your request' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to determine if a query is about legality
function isLegalityQuery(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  const legalityKeywords = [
    'legal', 'illegal', 'allowed', 'banned', 'prohibited', 'law', 'regulation',
    'compliant', 'compliance', 'restriction', 'permit', 'authorized', 'lawful',
    'policy', 'legality', 'prohibited', 'status', 'state law', 'federal law'
  ];
  
  const contentLower = content.toLowerCase();
  return legalityKeywords.some(keyword => contentLower.includes(keyword));
}

// Helper function to determine if a query is about files or documents
function isFileQuery(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  const fileKeywords = [
    'file', 'document', 'pdf', 'image', 'picture', 'photo', 'logo', 'sheet',
    'presentation', 'slide', 'deck', 'brochure', 'manual', 'guide', 'form',
    'template', 'spreadsheet', 'report', 'render', 'asset', 'marketing',
    'sales sheet', 'pos kit', 'pos material', 'download', 'upload'
  ];
  
  const contentLower = content.toLowerCase();
  return fileKeywords.some(keyword => contentLower.includes(keyword));
}

// Extract meaningful terms for database searches
function extractSearchTerms(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }
  
  // Simple extraction - can be enhanced with NLP in the future
  return content
    .split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.replace(/[^\w-]/g, ''))
    .filter(word => !/^(what|when|where|why|how|can|the|and|for|this|that)$/i.test(word));
}

// Fix for the reserved word issue
async function checkProductLegality(supabase, searchTerms, requestId) {
  const startTime = startTimer();
  try {
    // First, try to identify product names from the query
    await logEvent(supabase, requestId, 'searching_products', 'legality_check', 'Searching for products matching query terms', {
      metadata: { searchTerms }
    });
    
    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      await logEvent(supabase, requestId, 'no_search_terms', 'legality_check', 'No search terms provided for product search', {
        severity: 'warning'
      });
      return null;
    }
    
    const searchConditions = searchTerms.map(term => `name.ilike.%${term}%`).join(',');
    
    let { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id')
      .or(searchConditions)
      .limit(5);
    
    if (productsError) {
      await logError(supabase, requestId, 'legality_check', 'Error searching products', productsError);
      return null;
    }
    
    if (!products || products.length === 0) {
      await logEvent(supabase, requestId, 'no_direct_product_match', 'legality_check', 'No direct product matches found, trying brands');
      
      // If no direct product match, try brands
      let { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .or(searchTerms.map(term => `name.ilike.%${term}%`).join(','))
        .limit(5);
      
      if (brandsError) {
        await logError(supabase, requestId, 'legality_check', 'Error searching brands', brandsError);
      }
      
      if (brands && brands.length > 0) {
        await logEvent(supabase, requestId, 'brands_found', 'legality_check', `Found ${brands.length} brands matching query`, {
          metadata: { brandNames: brands.map(b => b.name) }
        });
        
        // Get products by brand
        const { data: brandProducts, error: brandProductsError } = await supabase
          .from('products')
          .select('id, name, brand_id')
          .in('brand_id', brands.map(b => b.id))
          .limit(10);
          
        if (brandProductsError) {
          await logError(supabase, requestId, 'legality_check', 'Error getting products by brand', brandProductsError);
        }
        
        if (brandProducts && brandProducts.length > 0) {
          products = brandProducts;
          await logEvent(supabase, requestId, 'products_by_brand_found', 'legality_check', `Found ${brandProducts.length} products from matched brands`);
        }
      }
    } else {
      await logEvent(supabase, requestId, 'direct_product_matches', 'legality_check', `Found ${products.length} products directly matching query`, {
        metadata: { productNames: products.map(p => p.name) }
      });
    }
    
    if (!products || products.length === 0) {
      await logEvent(supabase, requestId, 'no_products_found', 'legality_check', 'No products found matching query terms', {
        durationMs: calculateDuration(startTime)
      });
      return null; // No products found
    }
    
    // Get state permissions for these products
    await logEvent(supabase, requestId, 'fetching_state_permissions', 'legality_check', `Fetching state permissions for ${products.length} products`);
    
    const { data: statePermissions, error: permissionsError } = await supabase
      .from('state_allowed_products')
      .select('state_id, product_id')
      .in('product_id', products.map(p => p.id));
      
    if (permissionsError) {
      await logError(supabase, requestId, 'legality_check', 'Error getting state permissions', permissionsError);
      return null;
    }
    
    // Get state names
    const { data: states, error: statesError } = await supabase
      .from('states')
      .select('id, name');
      
    if (statesError) {
      await logError(supabase, requestId, 'legality_check', 'Error getting states', statesError);
      return null;
    }
    
    await logEvent(supabase, requestId, 'formatting_legality_data', 'legality_check', 'Formatting legality information');
    
    // Format the legality data
    let legalityInfo = "";
    
    for (const product of products) {
      // Get brand info
      let brandName = "Unknown Brand";
      if (product.brand_id) {
        const { data: brand } = await supabase
          .from('brands')
          .select('name')
          .eq('id', product.brand_id)
          .single();
          
        if (brand) brandName = brand.name;
      }
      
      // Find allowed states for this product
      const allowedStateIds = statePermissions
        .filter(sp => sp.product_id === product.id)
        .map(sp => sp.state_id);
        
      const allowedStates = states
        .filter(s => allowedStateIds.includes(s.id))
        .map(s => s.name);
        
      const disallowedStates = states
        .filter(s => !allowedStateIds.includes(s.id))
        .map(s => s.name);
      
      legalityInfo += `Product: ${product.name} (${brandName})\n`;
      legalityInfo += `Legal in ${allowedStates.length} states: ${allowedStates.join(', ')}\n`;
      legalityInfo += `Not legal in ${disallowedStates.length} states: ${disallowedStates.length > 10 ? 
        disallowedStates.slice(0, 10).join(', ') + '...' : 
        disallowedStates.join(', ')}\n\n`;
    }
    
    await logEvent(supabase, requestId, 'legality_check_complete', 'legality_check', 'Successfully compiled legality information', {
      durationMs: calculateDuration(startTime),
      metadata: { productCount: products.length }
    });
    
    return legalityInfo;
  } catch (error) {
    await logError(supabase, requestId, 'legality_check', 'Exception in checkProductLegality', error, {
      durationMs: calculateDuration(startTime)
    });
    return null;
  }
}

// Get relevant knowledge entries
async function getRelevantKnowledgeEntries(supabase, searchTerms, content, requestId) {
  const startTime = startTimer();
  try {
    let results = [];
    
    // First search: Look for exact brand matches
    await logEvent(supabase, requestId, 'searching_brand_entries', 'knowledge_search', 'Searching for brand entries');
    
    let { data: brandEntries, error: brandError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"brand"}')
      .or(searchTerms.map(term => `title.ilike.%${term}%`).join(','));
    
    if (brandError) {
      await logError(supabase, requestId, 'knowledge_search', 'Error searching for brands', brandError);
    } else if (brandEntries?.length) {
      await logEvent(supabase, requestId, 'brand_entries_found', 'knowledge_search', `Found ${brandEntries.length} brand entries`, {
        metadata: { brandTitles: brandEntries.map(e => e.title) }
      });
      
      results = results.concat(brandEntries.map(entry => 
        `Brand: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ));
    }

    // Second search: Look for product matches
    await logEvent(supabase, requestId, 'searching_product_entries', 'knowledge_search', 'Searching for product entries');
    
    let { data: productEntries, error: productError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"product"}')
      .or(searchTerms.map(term => `title.ilike.%${term}%`).join(','));
    
    if (productError) {
      await logError(supabase, requestId, 'knowledge_search', 'Error searching for products', productError);
    } else if (productEntries?.length) {
      await logEvent(supabase, requestId, 'product_entries_found', 'knowledge_search', `Found ${productEntries.length} product entries`, {
        metadata: { productTitles: productEntries.map(e => e.title) }
      });
      
      results = results.concat(productEntries.map(entry => 
        `Product: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ));
    }
    
    // Third search: General content search
    await logEvent(supabase, requestId, 'searching_general_entries', 'knowledge_search', 'Searching for general content matches');
    
    let { data: regulatoryEntries, error: regulatoryError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .textSearch('content', searchTerms.join(' | '));
    
    if (regulatoryError) {
      await logError(supabase, requestId, 'knowledge_search', 'Error searching regulatory content', regulatoryError);
    } else if (regulatoryEntries?.length) {
      // Filter out duplicates
      const uniqueEntries = regulatoryEntries.filter(entry =>
        !results.some(r => r.includes(entry.title))
      );
      
      await logEvent(supabase, requestId, 'general_entries_found', 'knowledge_search', `Found ${uniqueEntries.length} unique general entries`, {
        metadata: { regularTitles: uniqueEntries.map(e => e.title) }
      });
      
      results = results.concat(uniqueEntries.map(entry => 
        `Entry: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ));
    }
    
    // Fourth search: Find relevant JSON entries
    await logEvent(supabase, requestId, 'searching_json_entries', 'knowledge_search', 'Searching for JSON data entries');
    
    let { data: jsonEntries, error: jsonError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"json"}');
      
    if (jsonError) {
      await logError(supabase, requestId, 'knowledge_search', 'Error searching json entries', jsonError);
    } else if (jsonEntries?.length) {
      await logEvent(supabase, requestId, 'json_entries_found', 'knowledge_search', `Found ${jsonEntries.length} JSON entries`, {
        metadata: { jsonTitles: jsonEntries.map(e => e.title) }
      });
      
      // Format JSON entries to be more readable
      jsonEntries.forEach(entry => {
        try {
          // Try to parse the JSON content
          const jsonData = JSON.parse(entry.content);
          let jsonSummary = `JSON Data: ${entry.title}\n`;
          
          if (typeof jsonData === 'object') {
            if (Array.isArray(jsonData)) {
              jsonSummary += `Data contains ${jsonData.length} items/records.\n`;
              
              // Sample items to give context
              const sample = jsonData.slice(0, 3);
              sample.forEach((item, index) => {
                jsonSummary += `Sample ${index + 1}:\n`;
                if (typeof item === 'object') {
                  Object.entries(item).forEach(([key, value]) => {
                    jsonSummary += `- ${key}: ${JSON.stringify(value)}\n`;
                  });
                } else {
                  jsonSummary += `- Value: ${item}\n`;
                }
              });
            } else {
              Object.entries(jsonData).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                  jsonSummary += `- ${key}: Array with ${value.length} items\n`;
                } else if (typeof value === 'object' && value !== null) {
                  jsonSummary += `- ${key}: Object with keys [${Object.keys(value).join(', ')}]\n`;
                } else {
                  jsonSummary += `- ${key}: ${value}\n`;
                }
              });
            }
          }
          
          jsonSummary += `Tags: ${entry.tags?.join(', ') || 'None'}\n`;
          results.push(jsonSummary);
          
          await logEvent(supabase, requestId, 'json_entry_parsed', 'knowledge_search', `Successfully parsed JSON entry: ${entry.title}`);
        } catch (e) {
          // Fallback for invalid JSON
          results.push(`JSON Data: ${entry.title} (Invalid JSON format)\nTags: ${entry.tags?.join(', ') || 'None'}`);
          await logError(supabase, requestId, 'knowledge_search', `Error parsing JSON entry: ${entry.title}`, e);
        }
      });
    }
    
    await logEvent(supabase, requestId, 'knowledge_search_complete', 'knowledge_search', `Knowledge search completed with ${results.length} total entries`, {
      durationMs: calculateDuration(startTime)
    });
    
    return results;
  } catch (error) {
    await logError(supabase, requestId, 'knowledge_search', 'Exception in getRelevantKnowledgeEntries', error, {
      durationMs: calculateDuration(startTime)
    });
    return [];
  }
}

// Search for documents in Drive
async function searchDocuments(supabase, searchTerms, requestId) {
  const startTime = startTimer();
  try {
    if (searchTerms.length === 0) {
      await logEvent(supabase, requestId, 'search_documents_empty_terms', 'document_search', 'Empty search terms provided');
      return [];
    }
    
    // Create search query string
    const searchQuery = searchTerms.join(' ');
    
    await logEvent(supabase, requestId, 'search_documents_started', 'document_search', `Searching documents for: "${searchQuery}"`);
    
    const { data, error } = await supabase.functions.invoke('drive-integration', {
      body: { 
        operation: 'search', 
        query: searchQuery,
        limit: 5,
        requestId
      },
    });
    
    if (error) {
      await logError(supabase, requestId, 'document_search', 'Error searching documents', error, {
        durationMs: calculateDuration(startTime),
        metadata: { searchQuery }
      });
      return [];
    }
    
    await logEvent(supabase, requestId, 'search_documents_completed', 'document_search', `Document search found ${data?.files?.length || 0} results`, {
      durationMs: calculateDuration(startTime),
      metadata: { 
        resultCount: data?.files?.length || 0,
        fileNames: data?.files?.map(f => f.name) || [] 
      }
    });
    
    return data?.files || [];
  } catch (error) {
    await logError(supabase, requestId, 'document_search', 'Exception in searchDocuments', error, {
      durationMs: calculateDuration(startTime),
      metadata: { searchTerms }
    });
    return [];
  }
}

// Get content for specific document IDs
async function getDocumentContent(supabase, docIds, requestId) {
  const startTime = startTimer();
  try {
    if (!docIds || docIds.length === 0) {
      await logEvent(supabase, requestId, 'get_document_content_empty', 'document_content', 'No document IDs provided');
      return [];
    }
    
    await logEvent(supabase, requestId, 'get_document_content_started', 'document_content', `Fetching content for ${docIds.length} documents`);
    
    let documentEntries = [];
    
    for (const docId of docIds) {
      try {
        const docStartTime = startTimer();
        const { data, error } = await supabase.functions.invoke('drive-integration', {
          body: { 
            operation: 'get', 
            fileId: docId,
            requestId 
          },
        });
        
        if (error) {
          await logError(supabase, requestId, 'document_content', `Error invoking drive-integration for document ${docId}`, error);
          continue;
        }
        
        if (data?.content?.content) {
          documentEntries.push({
            title: data.file.name,
            content: data.content.content,
            file_id: docId,
            file_type: data.file.file_type,
            tags: ['document']
          });
          
          await logEvent(supabase, requestId, 'document_content_fetched', 'document_content', `Successfully fetched content for document ${docId}`, {
            durationMs: calculateDuration(docStartTime),
            metadata: { 
              documentName: data.file.name, 
              contentLength: data.content.content.length 
            }
          });
        } else {
          await logEvent(supabase, requestId, 'document_content_empty', 'document_content', `Document ${docId} has no content`, {
            durationMs: calculateDuration(docStartTime),
            severity: 'warning',
            metadata: { documentId: docId }
          });
        }
      } catch (error) {
        await logError(supabase, requestId, 'document_content', `Exception fetching document ${docId}`, error);
      }
    }
    
    await logEvent(supabase, requestId, 'get_document_content_completed', 'document_content', `Fetched ${documentEntries.length}/${docIds.length} document contents`, {
      durationMs: calculateDuration(startTime),
      metadata: { 
        successCount: documentEntries.length,
        totalRequested: docIds.length
      }
    });
    
    return documentEntries;
  } catch (error) {
    await logError(supabase, requestId, 'document_content', 'Exception in getDocumentContent', error, {
      durationMs: calculateDuration(startTime)
    });
    return [];
  }
}
