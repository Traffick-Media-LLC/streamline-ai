
import { Message } from "../types/chat";
import { supabase } from "@/integrations/supabase/client";

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const generateChatTitle = async (firstMessage: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: { 
        content: `Summarize this message in 3-4 words as a chat title: "${firstMessage}"`,
        mode: "simple",
        messages: [] // No context needed for title generation
      },
    });

    if (error) throw error;
    
    // Clean up the title - remove quotes and limit length
    const title = data.message.replace(/["']/g, '').trim();
    return title.length < 30 ? title : title.substring(0, 27) + '...';
  } catch (error) {
    console.error("Error generating chat title:", error);
    // Fallback to using first few words if AI title generation fails
    const words = firstMessage.split(' ');
    const title = words.slice(0, 3).join(' ');
    return title.length < 30 ? title : title.substring(0, 27) + '...';
  }
};

export const getMessagesByDate = (messages: Message[]) => {
  return messages.reduce<Record<string, Message[]>>((acc, message) => {
    // Use createdAt for date grouping, fall back to timestamp if present
    const time = message.timestamp || new Date(message.createdAt).getTime();
    const date = new Date(time).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(message);
    return acc;
  }, {});
};

// Utility function to add/manage knowledge entries
export const addKnowledgeEntry = async (title: string, content: string, tags: string[] = []) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert({
        title,
        content,
        tags,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding knowledge entry:", error);
    throw error;
  }
};

// Utility to check for existing knowledge entry by title
export const findKnowledgeEntryByTitle = async (title: string) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .ilike('title', title)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is the error code when no rows are returned
      console.error("Error finding knowledge entry:", error);
    }

    return data;
  } catch (error) {
    console.error("Error finding knowledge entry:", error);
    return null;
  }
};

// Get all brands from knowledge base
export const getAllBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"brand"}');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching brands:", error);
    return [];
  }
};

// Get products for a specific brand
export const getProductsByBrand = async (brandTitle: string) => {
  try {
    const { data, error } = await supabase
      .from('knowledge_entries')
      .select('*')
      .filter('is_active', 'eq', true)
      .filter('tags', 'cs', '{"product"}')
      .ilike('content', `%${brandTitle}%`);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching products by brand:", error);
    return [];
  }
};

// NEW: Identify brands by product type
export const identifyBrandsByProductType = async (productType: string): Promise<{
  brands: string[],
  uniqueBrand: string | null,
  products: any[]
}> => {
  try {
    // First, try to find product type in the products table
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, brand_id, brands(id, name, logo_url)')
      .ilike('name', `%${productType}%`);
    
    if (productsError) {
      console.error('Error fetching products by type:', productsError);
      return { brands: [], uniqueBrand: null, products: [] };
    }
    
    if (!products || products.length === 0) {
      // If no direct products found, check product_ingredients for product type
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('product_ingredients')
        .select('product_id, product_type')
        .eq('product_type', productType.toLowerCase());
        
      if (ingredientsError || !ingredients || ingredients.length === 0) {
        return { brands: [], uniqueBrand: null, products: [] };
      }
      
      // Get products by their IDs
      const productIds = ingredients.map(ing => ing.product_id);
      const { data: typeProducts, error: typeProductsError } = await supabase
        .from('products')
        .select('id, name, brand_id, brands(id, name, logo_url)')
        .in('id', productIds);
        
      if (typeProductsError || !typeProducts || typeProducts.length === 0) {
        return { brands: [], uniqueBrand: null, products: [] };
      }
      
      // Extract unique brands
      const brandMap = new Map();
      typeProducts.forEach(product => {
        if (product.brands) {
          brandMap.set(product.brands.id, product.brands.name);
        }
      });
      
      const brands = Array.from(brandMap.values());
      const uniqueBrand = brands.length === 1 ? brands[0] : null;
      
      return { 
        brands, 
        uniqueBrand, 
        products: typeProducts 
      };
    } else {
      // Extract unique brands from products
      const brandMap = new Map();
      products.forEach(product => {
        if (product.brands) {
          brandMap.set(product.brands.id, product.brands.name);
        }
      });
      
      const brands = Array.from(brandMap.values());
      const uniqueBrand = brands.length === 1 ? brands[0] : null;
      
      return { 
        brands, 
        uniqueBrand, 
        products 
      };
    }
  } catch (error) {
    console.error('Error in identifyBrandsByProductType:', error);
    return { brands: [], uniqueBrand: null, products: [] };
  }
};

