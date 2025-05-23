
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatQuery {
  messages: Message[];
  chatId: string;
  userId: string;
}

interface StateMapQueryResult {
  state: string;
  brand: string;
  product: string;
  isLegal: boolean;
  details?: string;
}

interface KnowledgeResult {
  title: string;
  content: string;
  tags?: string[];
  confidence?: number;
}

interface FileResult {
  file_name: string;
  file_url: string | null;
  mime_type: string;
  brand?: string | null;
  category?: string | null;
  confidence?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const { messages, chatId, userId } = await req.json() as ChatQuery;
    
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = messages[messages.length - 1].content;
    
    // 1. Determine which data source(s) to query based on the content
    const { dataSources, searchParams } = await determineDataSource(userMessage, messages);
    
    console.log("Selected data sources:", dataSources);
    console.log("Search params:", searchParams);

    // 2. Query the appropriate data source(s)
    const results = await queryDataSources(dataSources, searchParams, supabase);
    
    // 3. Format the response with the AI assistant
    const aiResponse = await generateAIResponse(messages, results, dataSources);
    
    // 4. Store the response in the database
    const { error: storeError } = await storeResponse(supabase, chatId, userId, aiResponse, results.sourceInfo);
    
    if (storeError) {
      console.error("Error storing response:", storeError);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse, 
        sourceInfo: results.sourceInfo 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function determineDataSource(query: string, messages: Message[]): Promise<{ dataSources: string[], searchParams: any }> {
  try {
    // Use OpenAI to determine the appropriate data source
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a query router for Streamline Group's internal AI assistant. Your task is to analyze the user query and determine which data sources to query:
            1. state_map - For questions about product legality by state
            2. knowledge_base - For questions about product information, company policies, or general info
            3. drive_files - For requests for specific documents or files
            
            Return a JSON object with the following fields:
            - dataSources: Array of data source names to query (state_map, knowledge_base, drive_files)
            - searchParams: Object with search parameters (state, brand, product, query, fileType)
            
            For state legality queries, identify the state, brand, and product mentioned.
            For knowledge base queries, extract key search terms.
            For file queries, identify file types or categories mentioned.`
          },
          ...messages.slice(-3).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      })
    });

    const data = await response.json();
    const routerResponse = data.choices[0].message.content;
    
    try {
      // Extract JSON from the response (handle if it's wrapped in code blocks)
      const jsonMatch = routerResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        routerResponse.match(/{[\s\S]*}/);
      
      const jsonStr = jsonMatch ? jsonMatch[0].replace(/```json|```/g, '') : routerResponse;
      const result = JSON.parse(jsonStr);
      
      return {
        dataSources: result.dataSources || [],
        searchParams: result.searchParams || {}
      };
    } catch (parseError) {
      console.error("Error parsing router response:", parseError);
      console.log("Raw response:", routerResponse);
      
      // Default to knowledge base if parsing fails
      return {
        dataSources: ['knowledge_base'],
        searchParams: { query }
      };
    }
  } catch (error) {
    console.error("Error determining data source:", error);
    
    // Default to knowledge base on error
    return {
      dataSources: ['knowledge_base'],
      searchParams: { query }
    };
  }
}

async function queryDataSources(dataSources: string[], params: any, supabase: any) {
  const results: {
    stateMapResults?: StateMapQueryResult[];
    knowledgeResults?: KnowledgeResult[];
    fileResults?: FileResult[];
    sourceInfo: {
      source: string;
      found: boolean;
      brand?: string;
      state?: string;
      message?: string;
    }
  } = {
    sourceInfo: {
      source: 'knowledge_base',
      found: false
    }
  };

  const queryPromises = [];

  // Query state map database
  if (dataSources.includes('state_map')) {
    queryPromises.push(queryStateMap(params, supabase)
      .then(stateMapResults => {
        results.stateMapResults = stateMapResults;
        if (stateMapResults && stateMapResults.length > 0) {
          results.sourceInfo = {
            source: 'product_database',
            found: true,
            brand: params.brand || stateMapResults[0].brand,
            state: params.state || stateMapResults[0].state,
          };
        }
      }));
  }

  // Query knowledge base
  if (dataSources.includes('knowledge_base')) {
    queryPromises.push(searchKnowledgeBase(params.query, supabase)
      .then(knowledgeResults => {
        results.knowledgeResults = knowledgeResults;
        if (knowledgeResults && knowledgeResults.length > 0 && !results.sourceInfo.found) {
          results.sourceInfo = {
            source: 'internet_knowledge',
            found: true,
            message: 'Found relevant information in knowledge base'
          };
        }
      }));
  }

  // Query drive files
  if (dataSources.includes('drive_files')) {
    queryPromises.push(searchDriveFiles(params, supabase)
      .then(fileResults => {
        results.fileResults = fileResults;
        if (fileResults && fileResults.length > 0 && !results.sourceInfo.found) {
          results.sourceInfo = {
            source: 'drive_files',
            found: true,
            message: 'Found relevant files'
          };
        }
      }));
  }

  await Promise.all(queryPromises);

  // If no results were found in any source
  if (!results.stateMapResults?.length && !results.knowledgeResults?.length && !results.fileResults?.length) {
    results.sourceInfo = {
      source: 'no_match',
      found: false,
      message: 'No matching information found in any database'
    };
  }

  return results;
}

async function queryStateMap(params: any, supabase: any): Promise<StateMapQueryResult[]> {
  try {
    const { state, brand, product } = params;
    
    // Start with a query that joins products, brands, and state_allowed_products tables
    let query = supabase
      .from('state_allowed_products')
      .select(`
        product_id,
        states!inner(id, name),
        products!inner(id, name, brand_id),
        brands!inner(id, name)
      `);
    
    // Apply filters based on parameters
    if (state) {
      // First try exact match
      const { data: stateData } = await supabase
        .from('states')
        .select('id')
        .ilike('name', state)
        .limit(1);
      
      if (stateData && stateData.length > 0) {
        query = query.eq('state_id', stateData[0].id);
      } else {
        // Try fuzzy match
        const { data: fuzzyStateData } = await supabase
          .from('states')
          .select('id, name')
          .or(`name.ilike.%${state}%`)
          .limit(1);
        
        if (fuzzyStateData && fuzzyStateData.length > 0) {
          query = query.eq('state_id', fuzzyStateData[0].id);
        } else {
          // No state match found
          return [];
        }
      }
    }
    
    if (brand) {
      // First try exact match on brand name
      const { data: brandData } = await supabase
        .from('brands')
        .select('id')
        .ilike('name', brand)
        .limit(1);
      
      if (brandData && brandData.length > 0) {
        query = query.eq('products.brand_id', brandData[0].id);
      } else {
        // Try fuzzy match
        const { data: fuzzyBrandData } = await supabase
          .from('brands')
          .select('id, name')
          .or(`name.ilike.%${brand}%`)
          .limit(5);
        
        if (fuzzyBrandData && fuzzyBrandData.length > 0) {
          const brandIds = fuzzyBrandData.map(b => b.id);
          query = query.in('products.brand_id', brandIds);
        }
      }
    }
    
    if (product) {
      // Try to match product name
      query = query.ilike('products.name', `%${product}%`);
    }
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transform the results into the expected format
    return data.map(item => ({
      state: item.states.name,
      brand: item.brands.name,
      product: item.products.name,
      isLegal: true, // Since it exists in state_allowed_products, it must be legal
      details: `${item.products.name} by ${item.brands.name} is legal in ${item.states.name}.`
    }));
  } catch (error) {
    console.error("Error querying state map:", error);
    return [];
  }
}

async function searchKnowledgeBase(query: string, supabase: any): Promise<KnowledgeResult[]> {
  try {
    // First, query for exact or close matches
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transform and return the results
    return data.map(item => ({
      title: item.title,
      content: item.content,
      tags: item.tags || [],
      // Simple relevance score based on how many query terms are in the content
      confidence: calculateRelevanceScore(query, item.title, item.content)
    }))
    .sort((a, b) => b.confidence - a.confidence) // Sort by confidence
    .slice(0, 3); // Return only top 3 results
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}

async function searchDriveFiles(params: any, supabase: any): Promise<FileResult[]> {
  try {
    const { query, fileType, brand, category } = params;
    
    // Start with the base query
    let dbQuery = supabase
      .from('drive_files')
      .select('*');
    
    // Apply filters based on available parameters
    const searchTerms = [];
    
    if (query) {
      searchTerms.push(`file_name.ilike.%${query}%`);
    }
    
    if (fileType) {
      dbQuery = dbQuery.ilike('mime_type', `%${fileType}%`);
    }
    
    if (brand) {
      dbQuery = dbQuery.ilike('brand', `%${brand}%`);
    }
    
    if (category) {
      dbQuery = dbQuery.ilike('category', `%${category}%`);
    }
    
    // If we have search terms, add them to the query
    if (searchTerms.length > 0) {
      dbQuery = dbQuery.or(searchTerms.join(','));
    }
    
    // Execute the query
    const { data, error } = await dbQuery.limit(10);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transform the results and calculate confidence scores
    return data.map(file => ({
      file_name: file.file_name,
      file_url: file.file_url,
      mime_type: file.mime_type,
      brand: file.brand,
      category: file.category,
      confidence: calculateFileRelevanceScore(query || '', file)
    }))
    .filter(file => file.confidence > 0.3)  // Filter by minimum confidence
    .sort((a, b) => b.confidence - a.confidence)  // Sort by confidence
    .slice(0, 3);  // Return only top 3 results
  } catch (error) {
    console.error("Error searching drive files:", error);
    return [];
  }
}

function calculateRelevanceScore(query: string, title: string, content: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const titleLower = title.toLowerCase();
  const contentLower = content.toLowerCase();
  
  let score = 0;
  
  // Check for title matches (higher weight)
  for (const term of queryTerms) {
    if (term.length < 3) continue; // Skip very short terms
    if (titleLower.includes(term)) {
      score += 3;
    }
  }
  
  // Check for content matches
  for (const term of queryTerms) {
    if (term.length < 3) continue;
    if (contentLower.includes(term)) {
      score += 1;
    }
  }
  
  // Normalize score between 0 and 1
  return Math.min(score / (queryTerms.length * 4), 1);
}

function calculateFileRelevanceScore(query: string, file: any): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const fileNameLower = file.file_name.toLowerCase();
  
  let score = 0;
  
  // Check for filename matches (highest weight)
  for (const term of queryTerms) {
    if (term.length < 3) continue; // Skip very short terms
    if (fileNameLower.includes(term)) {
      score += 3;
    }
  }
  
  // Check for brand matches
  if (file.brand) {
    const brandLower = file.brand.toLowerCase();
    for (const term of queryTerms) {
      if (term.length < 3) continue;
      if (brandLower.includes(term)) {
        score += 2;
      }
    }
  }
  
  // Check for category matches
  if (file.category) {
    const categoryLower = file.category.toLowerCase();
    for (const term of queryTerms) {
      if (term.length < 3) continue;
      if (categoryLower.includes(term)) {
        score += 2;
      }
    }
  }
  
  // Check subcategories
  for (let i = 1; i <= 6; i++) {
    const subcat = file[`subcategory_${i}`];
    if (subcat) {
      const subcatLower = subcat.toLowerCase();
      for (const term of queryTerms) {
        if (term.length < 3) continue;
        if (subcatLower.includes(term)) {
          score += 1;
        }
      }
    }
  }
  
  // Normalize score between 0 and 1
  return Math.min(score / (queryTerms.length * 5), 1);
}

async function generateAIResponse(messages: Message[], results: any, dataSources: string[]): Promise<string> {
  try {
    // Build context based on query results
    let context = "";
    
    // Add state map results to context
    if (results.stateMapResults && results.stateMapResults.length > 0) {
      context += "## State Map Database Results\n";
      results.stateMapResults.forEach((result: StateMapQueryResult) => {
        context += `- ${result.product} by ${result.brand} is ${result.isLegal ? 'legal' : 'not legal'} in ${result.state}.\n`;
      });
      context += "\n";
    }
    
    // Add knowledge base results to context
    if (results.knowledgeResults && results.knowledgeResults.length > 0) {
      context += "## Knowledge Base Results\n";
      results.knowledgeResults.forEach((result: KnowledgeResult) => {
        context += `### ${result.title}\n`;
        context += `${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}\n\n`;
        if (result.tags && result.tags.length > 0) {
          context += `Tags: ${result.tags.join(', ')}\n`;
        }
      });
      context += "\n";
    }
    
    // Add file results to context
    if (results.fileResults && results.fileResults.length > 0) {
      context += "## File Results\n";
      results.fileResults.forEach((result: FileResult) => {
        context += `- ${result.file_name}`;
        if (result.brand) context += ` (Brand: ${result.brand})`;
        if (result.category) context += ` (Category: ${result.category})`;
        if (result.file_url) context += ` [Download Link Available]`;
        context += "\n";
      });
      context += "\n";
    }
    
    // If no results were found
    if (!results.stateMapResults?.length && !results.knowledgeResults?.length && !results.fileResults?.length) {
      context += "No matching information found in any database. Please follow up with a more specific question or contact the appropriate department.\n\n";
    }
    
    // Generate response using OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are Streamline AI, the internal assistant for Streamline Group. 
            Use the following context from our databases to answer the user's question.
            
            When answering about product legality:
            - State clearly if a product is legal, not legal, or restricted
            - Include brand and product specifics when available
            - Mention ingredients like nicotine or cannabinoids if relevant
            
            When providing file information:
            - Only refer to files by name, never include raw URLs
            - If a file has a download link, tell the user it's available
            - If no match is found, recommend the Marketing Request Form
            
            Format your responses as follows:
            1. Short summary (1-2 sentences)
            2. Detailed explanation
            3. Include relevant context from the knowledge base
            4. Suggest next steps if needed
            
            Cite your sources clearly:
            "According to the State Map database..."
            "Based on the Knowledge Base..."
            
            For sales-specific questions, provide clear explanations that can be shared with distributors.
            
            Keep your tone conversational and helpful like an internal Slack chat.
            
            Here is the context from our databases:
            ${context}`
          },
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ]
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I'm sorry, I encountered an error while processing your request. Please try again or contact support.";
  }
}

async function storeResponse(supabase: any, chatId: string, userId: string, response: string, sourceInfo: any) {
  try {
    // Store the assistant response in the chat_messages table
    return await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        role: 'assistant',
        content: response,
        metadata: { sourceInfo }
      });
  } catch (error) {
    console.error("Error storing response:", error);
    return { error };
  }
}
