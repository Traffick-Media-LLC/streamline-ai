import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  try {
    const { content, messages, documentIds = [] } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Analyze the input to determine which sources to prioritize
    const legalityQuery = isLegalityQuery(content);
    const fileQuery = isFileQuery(content);
    
    console.log(`Query analysis - Legality: ${legalityQuery}, File: ${fileQuery}`);
    
    // Extract potential terms for database searches
    const searchTerms = extractSearchTerms(content);
    let knowledgeContext = "";
    let referencedSources = [];
    
    // 1. LEGALITY CHECK: Check Supabase state permissions for product legality questions
    if (legalityQuery) {
      console.log("Processing legality query with state map data");
      const legalityData = await checkProductLegality(supabase, searchTerms);
      
      if (legalityData) {
        knowledgeContext += "State Legality Data:\n\n" + legalityData + "\n\n";
        referencedSources.push("State Map Database");
      }
    }
    
    // 2. KNOWLEDGE BASE: Extract brand, product, and regulatory information from Knowledge Base
    // Extract potential brand and product names from the query
    let knowledgeEntries = await getRelevantKnowledgeEntries(supabase, searchTerms, content);
    
    if (knowledgeEntries.length > 0) {
      knowledgeContext += "Knowledge Base Information:\n\n" + knowledgeEntries.join("\n\n") + "\n\n";
      referencedSources.push("Knowledge Base");
    }
    
    // 3. DOCUMENT SEARCH: Search Google Drive for documents if it's a file query
    // or if document IDs are explicitly provided
    let documentEntries = [];
    
    // Process explicitly provided document IDs
    if (documentIds && documentIds.length > 0) {
      documentEntries = await getDocumentContent(supabase, documentIds);
      if (documentEntries.length > 0) {
        referencedSources.push("Selected Documents");
      }
    } 
    // Or search for documents if it's a file query
    else if (fileQuery) {
      const documentSearchResults = await searchDocuments(supabase, searchTerms);
      
      if (documentSearchResults.length > 0) {
        documentEntries = await getDocumentContent(supabase, 
          documentSearchResults.slice(0, 3).map(doc => doc.id));
          
        if (documentEntries.length > 0) {
          referencedSources.push("Drive Search");
        }
      }
    }
    
    // Add document content to context
    if (documentEntries.length > 0) {
      knowledgeContext += "Document References:\n\n";
      documentEntries.forEach(doc => {
        knowledgeContext += `Document: ${doc.title.replace('Document: ', '')}\n`;
        knowledgeContext += `Content Extract:\n${doc.content.substring(0, 1500)}${doc.content.length > 1500 ? '...' : ''}\n\n`;
      });
    }
    
    // Build the system prompt with the updated instructions
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
    }

    return new Response(
      JSON.stringify({ 
        message: data.choices[0].message.content,
        referencedDocuments
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
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
  // Simple extraction - can be enhanced with NLP in the future
  return content
    .split(/\s+/)
    .filter(word => word.length > 3)
    .map(word => word.replace(/[^\w-]/g, ''))
    .filter(word => !/^(what|when|where|why|how|can|the|and|for|this|that)$/i.test(word));
}

// Check for product legality in state database
async function checkProductLegality(supabase, searchTerms) {
  try {
    // First, try to identify product names from the query
    let { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id')
      .or(searchTerms.map(term => `name.ilike.%${term}%`).join(','))
      .limit(5);
    
    if (productsError) {
      console.error('Error searching products:', productsError);
      return null;
    }
    
    if (!products || products.length === 0) {
      // If no direct product match, try brands
      let { data: brands } = await supabase
        .from('brands')
        .select('id, name')
        .or(searchTerms.map(term => `name.ilike.%${term}%`).join(','))
        .limit(5);
      
      if (brands && brands.length > 0) {
        // Get products by brand
        const { data: brandProducts } = await supabase
          .from('products')
          .select('id, name, brand_id')
          .in('brand_id', brands.map(b => b.id))
          .limit(10);
          
        if (brandProducts && brandProducts.length > 0) {
          products = brandProducts;
        }
      }
    }
    
    if (!products || products.length === 0) {
      return null; // No products found
    }
    
    // Get state permissions for these products
    const { data: statePermissions, error: permissionsError } = await supabase
      .from('state_allowed_products')
      .select('state_id, product_id')
      .in('product_id', products.map(p => p.id));
      
    if (permissionsError) {
      console.error('Error getting state permissions:', permissionsError);
      return null;
    }
    
    // Get state names
    const { data: states, error: statesError } = await supabase
      .from('states')
      .select('id, name');
      
    if (statesError) {
      console.error('Error getting states:', statesError);
      return null;
    }
    
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
    
    return legalityInfo;
  } catch (error) {
    console.error('Error in checkProductLegality:', error);
    return null;
  }
}

// Get relevant knowledge entries
async function getRelevantKnowledgeEntries(supabase, searchTerms, content) {
  try {
    let results = [];
    
    // First search: Look for exact brand matches
    let { data: brandEntries, error: brandError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"brand"}')
      .or(searchTerms.map(term => `title.ilike.%${term}%`).join(','));
    
    if (brandError) {
      console.error('Error searching for brands:', brandError);
    } else if (brandEntries?.length) {
      results = results.concat(brandEntries.map(entry => 
        `Brand: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ));
    }

    // Second search: Look for product matches
    let { data: productEntries, error: productError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"product"}')
      .or(searchTerms.map(term => `title.ilike.%${term}%`).join(','));
    
    if (productError) {
      console.error('Error searching for products:', productError);
    } else if (productEntries?.length) {
      results = results.concat(productEntries.map(entry => 
        `Product: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ));
    }
    
    // Third search: General content search
    let { data: regulatoryEntries, error: regulatoryError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .textSearch('content', searchTerms.join(' | '));
    
    if (regulatoryError) {
      console.error('Error searching regulatory content:', regulatoryError);
    } else if (regulatoryEntries?.length) {
      // Filter out duplicates
      const uniqueEntries = regulatoryEntries.filter(entry =>
        !results.some(r => r.includes(entry.title))
      );
      
      results = results.concat(uniqueEntries.map(entry => 
        `Entry: ${entry.title}\n${entry.content}\nTags: ${entry.tags?.join(', ') || 'None'}`
      ));
    }
    
    // Fourth search: Find relevant JSON entries
    let { data: jsonEntries, error: jsonError } = await supabase
      .from('knowledge_entries')
      .select('title, content, updated_at, tags')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"json"}');
      
    if (jsonError) {
      console.error('Error searching json entries:', jsonError);
    } else if (jsonEntries?.length) {
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
        } catch (e) {
          // Fallback for invalid JSON
          results.push(`JSON Data: ${entry.title} (Invalid JSON format)\nTags: ${entry.tags?.join(', ') || 'None'}`);
        }
      });
    }
    
    return results;
  } catch (error) {
    console.error('Error in getRelevantKnowledgeEntries:', error);
    return [];
  }
}

// Search for documents in Drive
async function searchDocuments(supabase, searchTerms) {
  try {
    if (searchTerms.length === 0) return [];
    
    // Create search query string
    const searchQuery = searchTerms.join(' ');
    
    const { data, error } = await supabase.functions.invoke('drive-integration', {
      body: { 
        operation: 'search', 
        query: searchQuery,
        limit: 5
      },
    });
    
    if (error) {
      console.error('Error searching documents:', error);
      return [];
    }
    
    return data?.files || [];
  } catch (error) {
    console.error('Error in searchDocuments:', error);
    return [];
  }
}

// Get content for specific document IDs
async function getDocumentContent(supabase, docIds) {
  try {
    if (!docIds || docIds.length === 0) return [];
    
    let documentEntries = [];
    
    for (const docId of docIds) {
      try {
        const { data } = await supabase.functions.invoke('drive-integration', {
          body: { operation: 'get', fileId: docId },
        });
        
        if (data?.content?.content) {
          documentEntries.push({
            title: data.file.name,
            content: data.content.content,
            file_id: docId,
            file_type: data.file.file_type,
            tags: ['document']
          });
        }
      } catch (error) {
        console.error(`Error fetching document ${docId}:`, error);
      }
    }
    
    return documentEntries;
  } catch (error) {
    console.error('Error in getDocumentContent:', error);
    return [];
  }
}
