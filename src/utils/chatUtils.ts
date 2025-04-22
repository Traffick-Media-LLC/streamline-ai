
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
    const date = new Date(message.timestamp).toDateString();
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
