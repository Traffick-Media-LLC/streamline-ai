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
  id?: string;
}

// Brand name mapping to handle variations
const BRAND_ALIASES: {[key: string]: string[]} = {
  'Galaxy Treats': ['Orbital', 'Galaxy', 'Treats'],
  'Kush Burst': ['Kush', 'Burst'],
  'Delta Extrax': ['Delta', 'Extrax'],
  'TRĒ House': ['TRE House', 'TRE', 'Tre'],
  'Mellow Fellow': ['Mellow', 'Fellow'],
  'Juice Head': ['Juice', 'Head'],
};

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
    if (chatId) {
      const { error: storeError } = await storeResponse(supabase, chatId, userId, aiResponse, results.sourceInfo);
      
      if (storeError) {
        console.error("Error storing response:", storeError);
      }
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
    // Direct file ID detection
    const fileIdMatch = query.match(/([A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{4}-[A-Fa-f0-9]{12})/);
    if (fileIdMatch) {
      return {
        dataSources: ['drive_files'],
        searchParams: { fileId: fileIdMatch[0] }
      };
    }

    // Direct logo detection for common requests
    const logoMatch = query.toLowerCase().match(/(logo|image|icon|picture|photo|file) (?:for|of) ([a-z0-9\s]+)/i);
    const fileMatch = query.toLowerCase().match(/find (?:the|a) ([a-z0-9\s]+) (logo|image|file|document|sheet|sales sheet|spec)/i);
    
    if (logoMatch || fileMatch) {
      const brand = logoMatch ? logoMatch[2] : (fileMatch ? fileMatch[1] : '');
      const fileType = logoMatch ? logoMatch[1] : (fileMatch ? fileMatch[2] : '');
      
      if (brand && fileType) {
        return {
          dataSources: ['drive_files'],
          searchParams: { brand, fileType }
        };
      }
    }

    // Check for sales sheet queries specifically
    const salesSheetMatch = query.toLowerCase().match(/(sales\s*sheet|spec\s*sheet|sales\s*spec)/i);
    if (salesSheetMatch) {
      // Extract brand if available, otherwise just search for sales sheets
      const brandMatch = query.match(/(?:for|from|by|of)\s+([A-Za-z0-9\s&]+?)(?:\s|$)/i);
      const brand = brandMatch ? brandMatch[1].trim() : undefined;
      
      return {
        dataSources: ['drive_files'],
        searchParams: { 
          fileType: 'sales sheet',
          category: 'Sales Sheets:Specs',
          brand
        }
      };
    }

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
            content: `You are a query router for Streamline Group's internal AI assistant. Analyze the user query and determine which data sources to query.

IMPORTANT! If the user is looking for a logo, image, document, sales sheet, spec, or any file, ALWAYS include "drive_files" in your data sources.

Return a valid JSON object containing ONLY these fields:
{
  "dataSources": ["state_map" and/or "knowledge_base" and/or "drive_files"],
  "searchParams": {
    "state": "State name if mentioned",
    "brand": "Brand name if mentioned",
    "product": "Product name if mentioned",
    "query": "Search query for knowledge base",
    "fileType": "File type if mentioned (logo, document, image, sales sheet, spec, etc.)",
    "category": "File category if mentioned (like 'Sales Sheets:Specs')"
  }
}

EXAMPLES:
1. "Is Product X legal in California?" → dataSources: ["state_map"], searchParams: {state: "California", product: "Product X"}
2. "What's our refund policy?" → dataSources: ["knowledge_base"], searchParams: {query: "refund policy"}
3. "Show me the Galaxy Treats logo" → dataSources: ["drive_files"], searchParams: {brand: "Galaxy Treats", fileType: "logo"}
4. "Find the sales sheets for Galaxy Treats" → dataSources: ["drive_files"], searchParams: {brand: "Galaxy Treats", fileType: "sales sheet", category: "Sales Sheets:Specs"}

ALWAYS return properly formatted JSON.`
          },
          ...messages.slice(-3).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const routerResponse = data.choices[0].message.content;
    
    try {
      // Parse the JSON response
      const result = JSON.parse(routerResponse);
      
      // Add a fallback to search drive_files for specific keywords
      if (!result.dataSources.includes('drive_files') && 
          /\b(logo|file|image|document|pdf|picture|photo|sheet|sales|spec)\b/i.test(query)) {
        result.dataSources.push('drive_files');
      }
      
      // Set category for Sales Sheets if applicable
      if (result.searchParams.fileType && 
          /\b(sales\s*sheet|spec)/i.test(result.searchParams.fileType) && 
          !result.searchParams.category) {
        result.searchParams.category = 'Sales Sheets:Specs';
      }
      
      return {
        dataSources: result.dataSources || [],
        searchParams: result.searchParams || {}
      };
    } catch (parseError) {
      console.error("Error parsing router response:", parseError);
      console.log("Raw response:", routerResponse);
      
      // Default to multiple data sources for better coverage
      return {
        dataSources: ['knowledge_base', 'drive_files'],
        searchParams: { 
          query,
          // Extract potential brand and file type information
          brand: extractBrandFromQuery(query),
          fileType: extractFileTypeFromQuery(query)
        }
      };
    }
  } catch (error) {
    console.error("Error determining data source:", error);
    
    // Default to multiple data sources on error
    return {
      dataSources: ['knowledge_base', 'drive_files'],
      searchParams: { query }
    };
  }
}

// Helper function to extract brand information from query
function extractBrandFromQuery(query: string): string | undefined {
  const brands = [
    'Galaxy Treats', 'Kush Burst', 'Delta Extrax', 'Cake', 
    'Moonwlkr', 'Dimo', 'Urb', '3Chi', 'TRĒ House', 'TRE House',
    'Mellow Fellow', 'Looper', 'Torch', 'Juice Head'
  ];
  
  // Find any brand mentioned in the query
  const lowerQuery = query.toLowerCase();
  const foundBrand = brands.find(brand => lowerQuery.includes(brand.toLowerCase()));
  
  return foundBrand;
}

// Helper function to extract file type information from query
function extractFileTypeFromQuery(query: string): string | undefined {
  const fileTypes = {
    'logo': ['logo', 'brand image', 'company logo'],
    'document': ['document', 'doc', 'pdf', 'file', 'form', 'agreement'],
    'image': ['image', 'picture', 'photo', 'graphic', 'banner'],
    'sales sheet': ['sales sheet', 'spec sheet', 'specs', 'sales spec', 'product sheet', 'product spec']
  };
  
  const lowerQuery = query.toLowerCase();
  
  for (const [type, keywords] of Object.entries(fileTypes)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      return type;
    }
  }
  
  return undefined;
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
      brandLogo?: string | null;
      state?: string;
      message?: string;
      error?: string;
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
          // Try to find a logo for brand display
          const brandLogo = fileResults.find(file => 
            file.mime_type && file.mime_type.includes('image') && 
            file.file_name.toLowerCase().includes('logo'));
          
          results.sourceInfo = {
            source: 'drive_files',
            found: true,
            message: 'Found relevant files',
            brand: params.brand || (fileResults[0].brand || undefined),
            brandLogo: brandLogo?.file_url || null
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

/**
 * Enhanced drive files search function with fixed SQL syntax for PostgREST 
 */
async function searchDriveFiles(params: any, supabase: any): Promise<FileResult[]> {
  try {
    const { query, fileType, brand, fileId, product, category } = params;
    
    // Direct file ID lookup if provided
    if (fileId) {
      const { data, error } = await supabase
        .from('drive_files')
        .select('*')
        .eq('id', fileId)
        .limit(1);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data.map(file => ({
          file_name: file.file_name,
          file_url: file.file_url,
          mime_type: file.mime_type,
          brand: file.brand,
          category: file.category,
          id: file.id,
          confidence: 1.0  // Direct ID match gets maximum confidence
        }));
      }
    }

    // Special handling for logo searches
    if ((fileType && fileType.toLowerCase().includes('logo')) || 
        (query && query.toLowerCase().includes('logo'))) {
      console.log("Logo search detected, using simplified search");
      
      // For logo searches, prioritize matching by brand name and mime_type for images
      let logoQuery = supabase.from('drive_files')
        .select('*')
        .ilike('file_name', '%logo%'); // Look for 'logo' in filename
        
      // Add brand filter if specified
      if (brand) {
        // For brand matching in logo searches, we'll use a simpler approach
        // Find the normalized brand name
        const brandLower = brand.toLowerCase();
        
        // Try to match the brand directly
        logoQuery = logoQuery.or(`brand.ilike.%${brandLower}%,file_name.ilike.%${brandLower}%`);
        
        // Add variations if it's a known brand with aliases
        for (const [mainBrand, aliases] of Object.entries(BRAND_ALIASES)) {
          if (mainBrand.toLowerCase() === brandLower || 
              aliases.some(alias => alias.toLowerCase().includes(brandLower))) {
            
            // Add main brand as another search term
            if (mainBrand.toLowerCase() !== brandLower) {
              logoQuery = logoQuery.or(`brand.ilike.%${mainBrand.toLowerCase()}%,file_name.ilike.%${mainBrand.toLowerCase()}%`);
            }
            
            // Add each alias as a search term
            for (const alias of aliases) {
              if (alias.toLowerCase() !== brandLower) {
                logoQuery = logoQuery.or(`brand.ilike.%${alias.toLowerCase()}%,file_name.ilike.%${alias.toLowerCase()}%`);
              }
            }
            break;
          }
        }
      }
      
      // Prefer images for logo searches
      logoQuery = logoQuery.contains('mime_type', 'image');
      
      // Execute query
      const { data, error } = await logoQuery.limit(10);
      
      if (error) {
        console.error("Logo search error:", error);
        throw error;
      }
      
      if (data && data.length > 0) {
        console.log(`Logo search found ${data.length} matches`);
        
        // Calculate confidence scores and return results
        return data.map(file => ({
          file_name: file.file_name,
          file_url: file.file_url,
          mime_type: file.mime_type,
          brand: file.brand,
          category: file.category,
          id: file.id,
          confidence: calculateEnhancedFileRelevanceScore(params, file)
        }))
        .filter(file => file.confidence > 0.2)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
      } else {
        console.log("No logo files found with direct search");
      }
    }
    
    // Normal search for other file types - using simplified filter approach
    let dbQuery = supabase.from('drive_files').select('*');
    let filterApplied = false;
    
    // Apply text search filters one by one instead of complex OR conditions
    // File name search
    if (query && query.length > 2) {
      dbQuery = dbQuery.ilike('file_name', `%${query}%`);
      filterApplied = true;
    }
    
    // Type/category search
    if (fileType && fileType.length > 2) {
      if (filterApplied) {
        dbQuery = dbQuery.or(`category.ilike.%${fileType}%,file_name.ilike.%${fileType}%`);
      } else {
        dbQuery = dbQuery.ilike('file_name', `%${fileType}%`).or(`category.ilike.%${fileType}%`);
        filterApplied = true;
      }
    }
    
    // Brand search
    if (brand && brand.length > 2) {
      if (filterApplied) {
        dbQuery = dbQuery.or(`brand.ilike.%${brand}%,file_name.ilike.%${brand}%`);
      } else {
        dbQuery = dbQuery.ilike('brand', `%${brand}%`).or(`file_name.ilike.%${brand}%`);
        filterApplied = true;
      }
    }
    
    // Sales sheet special handling
    if (category && category.toLowerCase().includes('sales')) {
      if (filterApplied) {
        dbQuery = dbQuery.or(`category.ilike.%sales%,category.ilike.%sheet%,file_name.ilike.%sales%,file_name.ilike.%sheet%`);
      } else {
        dbQuery = dbQuery.ilike('category', '%sales%').or(`category.ilike.%sheet%,file_name.ilike.%sales%,file_name.ilike.%sheet%`);
        filterApplied = true;
      }
    }
    
    // If no filters were applied, add a basic filter to prevent returning all files
    if (!filterApplied) {
      if (product) {
        dbQuery = dbQuery.ilike('file_name', `%${product}%`);
      } else {
        // Default to most recent files if no search criteria
        dbQuery = dbQuery.order('created_at', { ascending: false });
      }
    }
    
    // Execute the query
    console.log("Executing general file search");
    const { data, error } = await dbQuery.limit(20);
    
    if (error) {
      console.error("Database query error:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No matching files found");
      return [];
    }
    
    console.log(`Found ${data.length} potential file matches`);
    
    // Calculate relevance scores with enhanced algorithm
    return data.map(file => ({
      file_name: file.file_name,
      file_url: file.file_url,
      mime_type: file.mime_type,
      brand: file.brand,
      category: file.category,
      id: file.id,
      confidence: calculateEnhancedFileRelevanceScore(params, file)
    }))
    .filter(file => file.confidence > 0.2)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  } catch (error) {
    console.error("Error searching drive files:", error);
    
    // Fall back to a simpler search method on error
    try {
      console.log("Attempting fallback search method");
      
      // Simple search with minimal filters to avoid syntax errors
      const { query, fileType, brand } = params;
      let fallbackQuery = supabase.from('drive_files').select('*');
      
      // Only add the most important filter
      if (brand) {
        fallbackQuery = fallbackQuery.ilike('brand', `%${brand}%`);
      } else if (fileType) {
        fallbackQuery = fallbackQuery.ilike('file_name', `%${fileType}%`);
      } else if (query) {
        fallbackQuery = fallbackQuery.ilike('file_name', `%${query}%`);
      }
      
      const { data } = await fallbackQuery.limit(5);
      
      if (data && data.length > 0) {
        console.log(`Fallback found ${data.length} matches`);
        return data.map(file => ({
          file_name: file.file_name,
          file_url: file.file_url,
          mime_type: file.mime_type,
          brand: file.brand,
          category: file.category,
          id: file.id,
          confidence: 0.5 // Default confidence for fallback results
        }));
      }
    } catch (fallbackError) {
      console.error("Fallback search also failed:", fallbackError);
    }
    
    return [];
  }
}

// Helper function to calculate enhanced file relevance score
function calculateEnhancedFileRelevanceScore(params: any, file: any): number {
  // Extract all search parameters
  const { query, fileType, brand, product, category } = params;
  
  // Get all text values from the file record
  const fileValues = {
    file_name: file.file_name?.toLowerCase() || '',
    brand: file.brand?.toLowerCase() || '',
    category: file.category?.toLowerCase() || '',
    subcategory_1: file.subcategory_1?.toLowerCase() || '',
    subcategory_2: file.subcategory_2?.toLowerCase() || '',
    subcategory_3: file.subcategory_3?.toLowerCase() || '',
    subcategory_4: file.subcategory_4?.toLowerCase() || '',
    subcategory_5: file.subcategory_5?.toLowerCase() || '',
    subcategory_6: file.subcategory_6?.toLowerCase() || '',
  };
  
  // Extract all search terms
  const searchTerms = [
    ...(query ? query.toLowerCase().split(/\s+/) : []),
    ...(product ? product.toLowerCase().split(/\s+/) : []),
    ...(fileType ? fileType.toLowerCase().split(/\s+/) : []),
  ].filter(term => term.length > 2); // Filter out very short terms
  
  // Initialize scoring
  let score = 0;
  const maxScore = 10; // Maximum possible score
  
  // BRAND MATCHING (worth up to 4 points)
  if (brand) {
    const brandLower = brand.toLowerCase();
    
    // Direct brand match (highest value)
    if (fileValues.brand === brandLower) {
      score += 4;
    } 
    // Brand is in the file name
    else if (fileValues.file_name.includes(brandLower)) {
      score += 3;
    }
    // Brand alias matches
    else {
      // Check for known brand aliases
      for (const [mainBrand, aliases] of Object.entries(BRAND_ALIASES)) {
        // If our search is for this brand
        if (mainBrand.toLowerCase() === brandLower || 
            aliases.some(alias => fileValues.brand === alias.toLowerCase() || 
                                 fileValues.file_name.includes(alias.toLowerCase()))) {
          score += 3;
          break;
        }
      }
    }
  }
  
  // FILE TYPE / CATEGORY MATCHING (worth up to 3 points)
  if (fileType || category) {
    const typeTerms = [
      ...(fileType ? [fileType.toLowerCase()] : []), 
      ...(category ? [category.toLowerCase().replace(/:/g, ' ')] : [])
    ];
    
    for (const typeTerm of typeTerms) {
      // Direct category match
      if (fileValues.category === typeTerm || 
          fileValues.category.includes(typeTerm)) {
        score += 3;
      }
      // Match in subcategories
      else if (
        fileValues.subcategory_1.includes(typeTerm) ||
        fileValues.subcategory_2.includes(typeTerm) ||
        fileValues.subcategory_3.includes(typeTerm) ||
        fileValues.subcategory_4.includes(typeTerm) ||
        fileValues.subcategory_5.includes(typeTerm) ||
        fileValues.subcategory_6.includes(typeTerm)
      ) {
        score += 2;
      }
      // Match in filename
      else if (fileValues.file_name.includes(typeTerm)) {
        score += 1;
      }
      
      // Special handling for sales sheets and spec sheets
      if (typeTerm.includes('sales') || typeTerm.includes('sheet') || typeTerm.includes('spec')) {
        const sheetTerms = ['sales sheet', 'salessheet', 'spec sheet', 'specsheet', 'specs'];
        
        // Check if any sheet-related term appears in any field
        let foundSheetTerm = false;
        for (const sheetTerm of sheetTerms) {
          if (
            fileValues.file_name.includes(sheetTerm) ||
            fileValues.category.includes(sheetTerm) ||
            fileValues.subcategory_1.includes(sheetTerm) ||
            fileValues.subcategory_2.includes(sheetTerm) ||
            fileValues.subcategory_3.includes(sheetTerm) ||
            fileValues.subcategory_4.includes(sheetTerm) ||
            fileValues.subcategory_5.includes(sheetTerm) ||
            fileValues.subcategory_6.includes(sheetTerm)
          ) {
            score += 2;
            foundSheetTerm = true;
            break;
          }
        }
        
        // Also check for partial matches with "sales" and "sheet" separately
        if (!foundSheetTerm) {
          const partialMatch = (
            fileValues.file_name.includes('sales') || 
            fileValues.category.includes('sales') ||
            fileValues.file_name.includes('sheet') || 
            fileValues.category.includes('sheet')
          );
          
          if (partialMatch) score += 1;
        }
      }
    }
  }
  
  // GENERAL SEARCH TERM MATCHING (worth up to 3 points)
  if (searchTerms.length > 0) {
    let termMatches = 0;
    
    // Check each search term against all file fields
    for (const term of searchTerms) {
      let matched = false;
      
      // Check against all file values
      for (const [field, value] of Object.entries(fileValues)) {
        if (value.includes(term)) {
          termMatches++;
          matched = true;
          break;
        }
      }
      
      // If the term was found, add points
      if (matched) {
        score += 0.5; // Add fractional points per term match
      }
    }
    
    // Bonus if all terms were matched
    if (termMatches === searchTerms.length && searchTerms.length > 1) {
      score += 1;
    }
  }
  
  // Normalize final score between 0 and 1
  return Math.min(score / maxScore, 1.0);
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
  // Keep this for backward compatibility, but use the new enhanced scoring
  return calculateEnhancedFileRelevanceScore({ query }, file);
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
    
    // Add file results to context with improved Markdown formatting
    if (results.fileResults && results.fileResults.length > 0) {
      context += "## File Results\n";
      results.fileResults.forEach((result: FileResult) => {
        // Format file name with bold markdown syntax
        context += `- **${result.file_name}**`;
        
        // Add file metadata
        if (result.id) context += ` (ID: ${result.id})`;
        if (result.brand) context += ` (Brand: ${result.brand})`;
        if (result.category) context += ` (Category: ${result.category})`;
        
        // Add a proper markdown link if URL is available
        if (result.file_url) {
          context += `\n  [Download Link](${result.file_url})`;
        } else {
          // Even if no URL is available, include this instruction to format properly in response
          context += `\n  (No download link available)`;
        }
        
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
            
            MARKDOWN FORMATTING RULES (CRITICAL):
            - When mentioning file names, ALWAYS use bold markdown: **filename.ext**
            - When providing download links, ALWAYS use markdown link syntax: [Download Link](URL)
            - NEVER display raw URLs in your response text
            - If no URL is available, show "[Download Link Unavailable]" in plain text
            
            When answering about product legality:
            - State clearly if a product is legal, not legal, or restricted
            - Include brand and product specifics when available
            - Mention ingredients like nicotine or cannabinoids if relevant
            
            When providing file information:
            - Each file must be listed as: "- **filename.ext**"
            - For file download links, use EXACTLY this format: "[Download Link](URL)"
            - If writing a link without URL, use EXACTLY: "[Download Link Available]" 
            
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
