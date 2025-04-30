
// Import required Deno modules
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Update the isFileQuery function to better detect file search queries
function isFileQuery(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  const fileKeywords = [
    'file', 'document', 'pdf', 'image', 'picture', 'photo', 'logo', 'sheet',
    'presentation', 'slide', 'deck', 'brochure', 'manual', 'guide', 'form',
    'template', 'spreadsheet', 'report', 'render', 'asset', 'marketing',
    'sales sheet', 'pos kit', 'pos material', 'download', 'upload', 
    'find me', 'locate', 'search for', 'get me', 'look for', 'where is', 
    'need', 'want', 'send me', 'share', 'send the', 'get the'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Check for file request patterns:
  // 1. Direct file type mentions
  if (/\.(pdf|docx?|xlsx?|pptx?|jpg|jpeg|png|gif|zip|csv|txt)\b/i.test(contentLower)) {
    return true;
  }
  
  // 2. Keywords that indicate file searching
  const keywordMatches = fileKeywords.filter(keyword => contentLower.includes(keyword)).length;
  
  // 3. Phrases that suggest looking for specific assets
  const lookingForPatterns = [
    /find (me |)(a |the |)(.+)/i,
    /looking for (a |the |)(.+)/i,
    /need (a |the |)(.+)/i, 
    /where (can I |do I |to |)find (a |the |)(.+)/i,
    /search for (a |the |)(.+)/i,
    /do (you |we |)have (a |the |)(.+)/i
  ];
  
  const matchesPattern = lookingForPatterns.some(pattern => pattern.test(contentLower));
  
  return keywordMatches >= 1 || matchesPattern;
}

// Add function to extract file search queries from the message
function extractFileSearchQuery(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  // Common patterns for file search
  const patterns = [
    /find (me |)(a |the |)(.+)/i,
    /looking for (a |the |)(.+)/i,
    /search for (a |the |)(.+)/i,
    /where (can I |do I |to |)find (a |the |)(.+)/i,
    /need (a |the |)(.+) (file|document|logo|image|sheet)/i,
    /get (me |)(a |the |)(.+) (file|document|logo|image|sheet)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[3]) {
      // Extract the search term, removing common stopwords at the end
      const searchTerm = match[3].replace(/(file|document|logo|image|sheet|please|thanks)$/i, '').trim();
      if (searchTerm.length > 2) {
        return searchTerm;
      }
    }
  }
  
  return null;
}

// Function to log events in the edge function
async function logEvent(supabase, requestId, eventType, component, message, metadata = {}) {
  try {
    const { error } = await supabase.from('chat_logs').insert({
      request_id: requestId,
      event_type: eventType,
      component,
      message,
      metadata
    });
    
    if (error) {
      console.error('Error logging chat event:', error);
    }
  } catch (err) {
    console.error('Exception logging chat event:', err);
  }
}

// Main server function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const requestTime = new Date();
    const { message, chatId, chatHistory, documentContent, requestId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Use the Supabase JS client in Deno
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    await logEvent(supabase, requestId, 'chat_request_received', 'chat_function', 'Chat request received', {
      chatId,
      hasHistory: chatHistory && chatHistory.length > 0,
      hasDocumentContent: documentContent && documentContent.length > 0
    });
    
    // Initialize empty array to track referenced sources
    let referencedSources = [];
    let documentEntries = [];
    
    // Process document content if provided
    if (documentContent && documentContent.length > 0) {
      documentEntries = documentContent;
      
      await logEvent(supabase, requestId, 'document_content_received', 'chat_function', 
        `Received ${documentContent.length} document entries`, {
          documentCount: documentContent.length,
          documentNames: documentContent.map(d => d.name)
        });
    }
    
    // Detect if this is a file query
    const isSearchingForFiles = isFileQuery(message);
    if (isSearchingForFiles) {
      await logEvent(supabase, requestId, 'file_query_detected', 'chat_function', 
        'Detected file search query', { message });
    }
    
    // Extract file search query if present
    const fileSearchQuery = extractFileSearchQuery(message);
    if (fileSearchQuery) {
      await logEvent(supabase, requestId, 'file_search_query_extracted', 'chat_function', 
        `Extracted file search query: ${fileSearchQuery}`, { query: fileSearchQuery });
    }
    
    // Prepare messages for OpenAI
    let messages = [];
    
    // Add system prompt
    const baseSystemPrompt = `You are the AI assistant for Streamline Group Employees inside the Streamline Group Portal. 

Your role is to intelligently answer employee questions about product legality, information about Streamline Group's products, employee resources, and company documents.

Follow this strict source hierarchy based on the type of question:

1. If the user asks about product legality or regulatory status by state (e.g., "Is Delta-8 legal in Texas?"), you must check and pull from the Supabase backend database that powers the U.S. State Map.
2. If the user asks general questions about company information (e.g., "What brands does Streamline sell?" or "Where can I find the marketing request form?"), reference the AI Knowledge Base first.
3. If the user asks for specific files, images, logos, product renders, sales sheets, POS kits, or documents (e.g., "Can I find the Alcohol Armor sales sheet?" or "Where is the POS kit for Juice Head?"), then search and retrieve information from the Google Drive integration.

For file queries:
- When files are found, ALWAYS include the direct web links to the files
- Present links in a clear, organized format
- Clearly indicate file types (e.g., PDF, spreadsheet, image)
- Only include the most relevant files (maximum 5)

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

    messages.push({
      role: "system",
      content: baseSystemPrompt
    });
    
    // Add chat history if available
    if (chatHistory && chatHistory.length > 0) {
      // Format chat history for OpenAI context
      messages = messages.concat(
        chatHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      );
      
      await logEvent(supabase, requestId, 'chat_history_processed', 'chat_function', 
        `Processed ${chatHistory.length} chat history messages`);
    }
    
    // Add current user message
    messages.push({
      role: "user",
      content: message
    });
    
    // Add document context if available
    if (documentEntries && documentEntries.length > 0) {
      // Build context from documents
      const documentContext = documentEntries.map(doc => 
        `Document: ${doc.name}\n${doc.content}`
      ).join('\n\n');
      
      // Add document context to the latest user message
      messages[messages.length - 1].content += `\n\nPlease reference these documents in your answer:\n${documentContext}`;
      
      await logEvent(supabase, requestId, 'document_context_added', 'chat_function', 
        `Added ${documentEntries.length} documents to context`);
    }
    
    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    // Special mode for health check
    if (req.json && req.json.mode === "health_check") {
      return new Response(
        JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Call OpenAI API
    await logEvent(supabase, requestId, 'openai_request_started', 'chat_function', 
      'Sending request to OpenAI');
      
    const openaiStartTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500
      })
    });
    
    const responseTime = Date.now() - openaiStartTime;
    
    if (!response.ok) {
      const error = await response.text();
      await logEvent(supabase, requestId, 'openai_request_failed', 'chat_function', 
        `OpenAI request failed: ${error}`, { status: response.status });
        
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    
    await logEvent(supabase, requestId, 'openai_response_received', 'chat_function', 
      'Received response from OpenAI', { 
        responseTime, 
        tokens: data.usage?.total_tokens || 0,
        model: data.model
      });
    
    // Initialize empty array for referenced documents
    let referencedDocuments = [];
    
    // Update document search handling to extract file information better
    if (documentEntries?.length > 0) {
      // Simple heuristic to find document references with improved link handling
      const assistantMessage = data.choices[0].message.content;
      documentEntries.forEach(doc => {
        const docName = doc.title ? doc.title.replace('Document: ', '') : doc.name;
        const webLink = doc.webLink;
        
        // Check if the document is referenced in the response
        if (assistantMessage.includes(docName)) {
          referencedDocuments.push({
            id: doc.file_id || doc.id,
            name: docName,
            webLink: webLink // Include the web link
          });
        }
      });
      
      await logEvent(supabase, requestId, 'document_references_extracted', 'chat_function', 
        `Extracted ${referencedDocuments.length} document references from response`, {
          metadata: {
            referencedDocuments: referencedDocuments.map(d => ({name: d.name, hasLink: !!d.webLink}))
          },
          category: 'document'
      });
    }
    
    // Respond with the AI assistant's message and metadata
    return new Response(
      JSON.stringify({
        message: data.choices[0].message.content,
        referencedDocuments,
        model: data.model,
        tokensUsed: data.usage?.total_tokens || 0,
        responseTime
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
    
  } catch (error) {
    console.error('Error processing chat request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: `Error processing your request: ${error.message}` 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});
