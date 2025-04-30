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

// Enhanced logging function with categories and component info
const logEvent = async (supabase, requestId, eventType, component, message, options = {}) => {
  try {
    const { 
      userId = null, 
      chatId = null, 
      durationMs = null, 
      metadata = null, 
      errorDetails = null,
      severity = 'info',
      category = 'generic'
    } = options;
    
    // Add current context info to metadata
    const enhancedMetadata = {
      ...(metadata || {}),
      component,
      timestamp: Date.now()
    };
    
    // Log to console with improved format
    const logPrefix = `[${requestId}][${component}][${eventType}][${category}]`;
    if (severity === 'error' || severity === 'critical') {
      console.error(`${logPrefix} ${message}`, errorDetails || enhancedMetadata || {});
    } else if (severity === 'warning') {
      console.warn(`${logPrefix} ${message}`, enhancedMetadata || {});
    } else {
      console.log(`${logPrefix} ${message}`, enhancedMetadata || {});
    }
    
    // Store in database with enhanced data
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
            category,
            message,
            duration_ms: durationMs,
            metadata: enhancedMetadata,
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

// Enhanced error logging with improved error categorization
const logError = async (supabase, requestId, component, message, error, options = {}) => {
  try {
    // Enhanced error extraction
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      status: error?.status || error?.statusCode,
      statusText: error?.statusText,
      endpoint: options.endpoint || 'unknown',
      // Extract additional context from the error object
      responseData: error?.response?.data,
      errorBody: error?.body,
    };
    
    // Determine appropriate category
    const category = options.category || 'generic';
    
    await logEvent(supabase, requestId, 'error', component, message, {
      ...options,
      errorDetails,
      severity: options.severity || 'error',
      category
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
        JSON.stringify({ 
          error: "Invalid request format: " + jsonError.message,
          details: {
            message: jsonError.message,
            name: jsonError.name
          }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const { content, messages, documentIds = [], documentContents = [], requestId: clientRequestId } = requestData;
    
    requestId = clientRequestId || `edge-${Date.now()}`;
    
    // Initial request log with enhanced details
    await logEvent(supabase, requestId, 'edge_request_started', 'chat_function', 'Chat function request received', {
      metadata: { 
        messageCount: messages?.length || 0,
        documentCount: documentIds?.length || 0,
        contentLength: content?.length || 0,
        hasDocuments: (documentIds?.length || 0) > 0,
        hasDocumentContents: (documentContents?.length || 0) > 0,
        contentHash: content ? hashContent(content) : null // Add hash for correlation
      }
    });
    
    // Validate inputs with improved error handling
    if (!content) {
      await logError(supabase, requestId, 'chat_function', 'Missing content in request', 
        new Error('Content is required'), { category: 'validation' });
      
      return new Response(
        JSON.stringify({ error: "Missing 'content' in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!messages || !Array.isArray(messages)) {
      await logError(supabase, requestId, 'chat_function', 'Missing or invalid messages array', 
        new Error('Messages array is required'), { category: 'validation' });
      
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'messages' array in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Analyze the input to determine which sources to prioritize
    const analyzeStartTime = startTimer();
    let legalityQuery = false;
    let fileQuery = false;
    
    try {
      legalityQuery = isLegalityQuery(content);
      fileQuery = isFileQuery(content);
    } catch (analyzeError) {
      await logError(supabase, requestId, 'query_analysis', 'Error analyzing query', analyzeError, 
        { category: 'ai_processing' });
      // Default to false if analysis fails
    }
    
    await logEvent(supabase, requestId, 'query_analysis', 'chat_function', `Query analysis completed: Legality=${legalityQuery}, File=${fileQuery}`, {
      durationMs: calculateDuration(analyzeStartTime),
      metadata: { isLegalityQuery: legalityQuery, isFileQuery: fileQuery },
      category: 'ai_processing'
    });
    
    // Extract potential terms for database searches with enhanced validation
    let searchTerms = [];
    try {
      searchTerms = extractSearchTerms(content);
      
      if (searchTerms.length === 0) {
        await logEvent(supabase, requestId, 'search_terms_empty', 'chat_function', 
          'No meaningful search terms extracted from query', {
          severity: 'warning',
          category: 'ai_processing',
          metadata: { content: content.substring(0, 100) }
        });
      }
    } catch (extractError) {
      await logError(supabase, requestId, 'search_term_extraction', 'Error extracting search terms', 
        extractError, { category: 'ai_processing' });
      searchTerms = [];
    }
    
    await logEvent(supabase, requestId, 'search_terms_extracted', 'chat_function', `Search terms extracted from query`, {
      metadata: { searchTerms, termCount: searchTerms.length },
      category: 'ai_processing'
    });
    
    let knowledgeContext = "";
    let referencedSources = [];
    
    // 1. LEGALITY CHECK: Check Supabase state permissions for product legality questions
    if (legalityQuery) {
      await logEvent(supabase, requestId, 'legality_check_started', 'chat_function', 
        'Processing legality query with state map data', { category: 'database' });
      
      const legalityStartTime = startTimer();
      
      try {
        const legalityData = await checkProductLegality(supabase, searchTerms, requestId);
        
        if (legalityData) {
          knowledgeContext += "State Legality Data:\n\n" + legalityData + "\n\n";
          referencedSources.push("State Map Database");
          
          await logEvent(supabase, requestId, 'legality_data_found', 'chat_function', 'Found legality data in state map database', {
            durationMs: calculateDuration(legalityStartTime),
            metadata: { dataLength: legalityData.length },
            category: 'database'
          });
        } else {
          await logEvent(supabase, requestId, 'legality_data_not_found', 'chat_function', 'No legality data found in state map database', {
            durationMs: calculateDuration(legalityStartTime),
            severity: 'warning',
            category: 'database'
          });
        }
      } catch (legalityError) {
        await logError(supabase, requestId, 'legality_check', 'Error checking product legality', 
          legalityError, { category: 'database' });
      }
    }
    
    // 2. KNOWLEDGE BASE: Extract brand, product, and regulatory information from Knowledge Base
    const knowledgeStartTime = startTimer();
    await logEvent(supabase, requestId, 'knowledge_search_started', 'chat_function', 'Querying knowledge base', {
      category: 'database'
    });
    
    let knowledgeEntries = [];
    try {
      knowledgeEntries = await getRelevantKnowledgeEntries(supabase, searchTerms, content, requestId);
      
      if (knowledgeEntries.length > 0) {
        knowledgeContext += "Knowledge Base Information:\n\n" + knowledgeEntries.join("\n\n") + "\n\n";
        referencedSources.push("Knowledge Base");
        
        await logEvent(supabase, requestId, 'knowledge_entries_found', 'chat_function', `Found ${knowledgeEntries.length} relevant knowledge entries`, {
          durationMs: calculateDuration(knowledgeStartTime),
          metadata: { entryCount: knowledgeEntries.length },
          category: 'database'
        });
      } else {
        await logEvent(supabase, requestId, 'knowledge_entries_not_found', 'chat_function', 'No relevant knowledge entries found', {
          durationMs: calculateDuration(knowledgeStartTime),
          severity: 'warning',
          category: 'database'
        });
      }
    } catch (knowledgeError) {
      await logError(supabase, requestId, 'knowledge_search', 'Error searching knowledge base', 
        knowledgeError, { category: 'database' });
    }
    
    // 3. DOCUMENT SEARCH: Search Google Drive for documents if it's a file query
    // or if document IDs are explicitly provided
    let documentEntries = [];
    
    // Process explicitly provided document IDs with enhanced error logging
    if (documentIds && documentIds.length > 0) {
      await logEvent(supabase, requestId, 'process_provided_documents', 'chat_function', 
        `Processing ${documentIds.length} provided document IDs`, {
          metadata: { documentIds },
          category: 'document'
      });
      
      // If document contents were passed from frontend, use them
      if (documentContents && documentContents.length > 0) {
        await logEvent(supabase, requestId, 'using_provided_document_contents', 'chat_function', 
          `Using ${documentContents.length} pre-fetched document contents`, {
            metadata: { 
              documentCount: documentContents.length,
              documentIds: documentContents.map(doc => doc.id),
              documentNames: documentContents.map(doc => doc.name)
            },
            category: 'document'
        });
        
        // Validate document contents format
        const validDocuments = documentContents.filter(doc => 
          doc && doc.id && doc.content && typeof doc.content === 'string');
        
        if (validDocuments.length < documentContents.length) {
          await logEvent(supabase, requestId, 'invalid_document_contents', 'chat_function', 
            `${documentContents.length - validDocuments.length} documents have invalid format`, {
              severity: 'warning',
              category: 'document',
              metadata: { 
                totalDocuments: documentContents.length, 
                validDocuments: validDocuments.length
              }
          });
        }
        
        documentEntries = validDocuments.map(doc => ({
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
        try {
          documentEntries = await getDocumentContent(supabase, documentIds, requestId);
          
          if (documentEntries.length > 0) {
            referencedSources.push("Selected Documents");
            
            await logEvent(supabase, requestId, 'document_contents_fetched', 'chat_function', 
              `Fetched ${documentEntries.length}/${documentIds.length} document contents`, {
                durationMs: calculateDuration(docStartTime),
                metadata: {
                  successCount: documentEntries.length,
                  totalRequested: documentIds.length,
                  documentTitles: documentEntries.map(d => d.title.replace('Document: ', ''))
                },
                category: 'document'
            });
          } else {
            await logEvent(supabase, requestId, 'document_contents_not_found', 'chat_function', 
              'Failed to fetch document contents', {
                durationMs: calculateDuration(docStartTime),
                severity: 'warning',
                category: 'document',
                metadata: { requestedIds: documentIds }
            });
          }
        } catch (docError) {
          await logError(supabase, requestId, 'document_content', 'Error fetching document contents', 
            docError, { category: 'document', metadata: { documentIds } });
        }
      }
    } 
    // Or search for documents if it's a file query
    else if (fileQuery) {
      const searchStartTime = startTimer();
      await logEvent(supabase, requestId, 'document_search_started', 'chat_function', 
        'Searching for documents based on query', { category: 'document' });
      
      try {
        const documentSearchResults = await searchDocuments(supabase, searchTerms, requestId);
        
        if (documentSearchResults.length > 0) {
          await logEvent(supabase, requestId, 'document_search_results', 'chat_function', 
            `Found ${documentSearchResults.length} documents in search`, {
              durationMs: calculateDuration(searchStartTime),
              metadata: { 
                resultCount: documentSearchResults.length,
                documentNames: documentSearchResults.map(d => d.name)
              },
              category: 'document'
          });
          
          const contentStartTime = startTimer();
          documentEntries = await getDocumentContent(
            supabase, 
            documentSearchResults.slice(0, 3).map(doc => doc.id),
            requestId
          );
            
          if (documentEntries.length > 0) {
            referencedSources.push("Drive Search");
            
            await logEvent(supabase, requestId, 'document_content_fetched_from_search', 'chat_function', 
              `Fetched content for ${documentEntries.length} documents from search results`, {
                durationMs: calculateDuration(contentStartTime),
                category: 'document',
                metadata: { documentTitles: documentEntries.map(d => d.title.replace('Document: ', '')) }
            });
          } else {
            await logEvent(supabase, requestId, 'document_content_not_found_from_search', 'chat_function', 
              'Failed to fetch content for search results', {
                durationMs: calculateDuration(contentStartTime),
                severity: 'warning',
                category: 'document'
            });
          }
        } else {
          await logEvent(supabase, requestId, 'document_search_no_results', 'chat_function', 
            'No documents found matching search terms', {
              durationMs: calculateDuration(searchStartTime),
              severity: 'warning',
              category: 'document',
              metadata: { searchTerms }
          });
        }
      } catch (searchError) {
        await logError(supabase, requestId, 'document_search', 'Error searching documents', 
          searchError, { category: 'document', metadata: { searchTerms } });
      }
    }
    
    // Add document content to context
    if (documentEntries.length > 0) {
      knowledgeContext += "Document References:\n\n";
      documentEntries.forEach(doc => {
        knowledgeContext += `Document: ${doc.title.replace('Document: ', '')}\n`;
        knowledgeContext += `Content Extract:\n${doc.content.substring(0, 1500)}${doc.content.length > 1500 ? '...' : ''}\n\n`;
      });
      
      await logEvent(supabase, requestId, 'added_document_context', 'chat_function', 
        `Added ${documentEntries.length} documents to context`, {
          metadata: {
            documentTitles: documentEntries.map(d => d.title.replace('Document: ', ''))
          },
          category: 'document'
      });
    }
    
    // Build the system prompt with the updated instructions
    await logEvent(supabase, requestId, 'building_system_prompt', 'chat_function', 
      'Building system prompt for AI', { category: 'ai_processing' });
    
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

    // OpenAI API call with enhanced error handling
    await logEvent(supabase, requestId, 'calling_openai', 'chat_function', 'Calling OpenAI API', {
      metadata: { 
        modelName: 'gpt-4o',
        promptLength: systemContent?.length || 0,
        messageCount: conversationMessages?.length || 0
      },
      category: 'ai_response'
    });
    
    const aiStartTime = startTimer();
    
    // Check for OpenAI API key before making the call
    if (!openAIApiKey) {
      await logError(supabase, requestId, 'chat_function', 'OpenAI API key not configured', 
        new Error('Missing OPENAI_API_KEY environment variable'), 
        { category: 'credential', severity: 'critical' });
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API key not configured',
          details: {
            message: 'The OpenAI API key is missing from environment variables',
            fix: 'Add OPENAI_API_KEY to Supabase Edge Function secrets'
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    try {
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
      
      // Handle non-200 responses with detailed logging
      if (!response.ok) {
        const errorBody = await response.text();
        let parsedError;
        
        try {
          parsedError = JSON.parse(errorBody);
        } catch {
          parsedError = { raw: errorBody };
        }
        
        const openAiError = new Error(`OpenAI API returned status ${response.status}`);
        
        await logError(supabase, requestId, 'openai_api', 'OpenAI API error response', 
          openAiError, { 
            category: 'ai_response', 
            severity: 'critical',
            endpoint: 'chat/completions',
            metadata: { 
              status: response.status, 
              statusText: response.statusText,
              errorBody: parsedError,
              modelRequested: 'gpt-4o'
            }
          });
        
        // Determine if it's a credential issue
        const isCredentialIssue = response.status === 401 || 
                                 response.status === 403 ||
                                 errorBody.includes('key') ||
                                 errorBody.includes('auth');
                                 
        if (isCredentialIssue) {
          return new Response(
            JSON.stringify({ 
              error: 'OpenAI API authentication error',
              details: {
                message: 'There was an issue authenticating with the OpenAI API',
                status: response.status,
                fix: 'Verify your OpenAI API key is correct and has sufficient permissions'
              }
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            error: 'Error from OpenAI API',
            details: {
              status: response.status,
              message: parsedError?.error?.message || 'Unknown OpenAI error'
            }
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        await logError(supabase, requestId, 'openai_api', 'Invalid response format from OpenAI', 
          new Error('Missing choices in OpenAI response'), { 
            category: 'ai_response',
            severity: 'error',
            metadata: { 
              responseData: JSON.stringify(data).substring(0, 500)
            }
          });
        
        throw new Error(`OpenAI API returned invalid response format`);
      }
      
      const aiDuration = calculateDuration(aiStartTime);
      await logEvent(supabase, requestId, 'openai_response_received', 'chat_function', 'Received response from OpenAI API', {
        durationMs: aiDuration,
        metadata: { 
          responseLength: data.choices[0].message.content.length,
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
          model: data.model || 'gpt-4o'
        },
        category: 'ai_response'
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
        
        await logEvent(supabase, requestId, 'document_references_extracted', 'chat_function', 
          `Extracted ${referencedDocuments.length} document references from response`, {
            metadata: {
              referencedDocuments: referencedDocuments.map(d => d.name)
            },
            category: 'document'
        });
      }

      await logEvent(supabase, requestId, 'request_completed', 'chat_function', 'Chat function request completed successfully', {
        durationMs: calculateDuration(mainStartTime),
        metadata: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
          responseLength: data.choices[0].message.content.length,
          model: data.model || 'gpt-4o',
          referencedDocumentsCount: referencedDocuments.length
        }
      });
      
      return new Response(
        JSON.stringify({ 
          message: data.choices[0].message.content,
          referencedDocuments,
          usage: data.usage,
          model: data.model || 'gpt-4o'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (openAiError) {
      await logError(supabase, requestId, 'openai_api', 'Exception calling OpenAI API', 
        openAiError, { 
          category: 'ai_response', 
          severity: 'critical',
          endpoint: 'chat/completions'
        });
      
      return new Response(
        JSON.stringify({ 
          error: 'Error processing your request',
          details: {
            message: openAiError.message || 'Unknown error communicating with AI service',
            type: 'ai_service_error'
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    const errorMessage = `Error in chat function: ${error.message || 'Unknown error'}`;
    await logError(supabase, requestId, 'chat_function', errorMessage, error, {
      severity: 'critical',
      durationMs: calculateDuration(mainStartTime),
      category: 'generic'
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Error processing your request',
        details: {
          message: error.message || 'Unknown error in chat processing',
          type: 'server_error'
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Simple content hash function for correlation
function hashContent(content) {
  if (!content) return '';
  
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

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
      metadata: { searchTerms },
      category: 'database'
    });
    
    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      await logEvent(supabase, requestId, 'no_search_terms', 'legality_check', 'No search terms provided for product search', {
        severity: 'warning',
        category: 'database'
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
          metadata: { brandNames: brands.map(b => b.name) },
          category: 'database'
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
        
        if (brandProducts && brandProducts.length > 0)
