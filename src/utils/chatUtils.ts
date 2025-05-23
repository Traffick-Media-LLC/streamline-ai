
import { supabase } from "@/integrations/supabase/client";

/**
 * Formats a timestamp to a relative date string
 */
export const formatDate = (timestamp: number): string => {
  const now = Date.now();
  const date = new Date(timestamp);
  const diffInDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return "Today";
  } else if (diffInDays === 1) {
    return "Yesterday";
  } else if (diffInDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

/**
 * Generates a chat title based on the first message
 */
export const generateChatTitle = async (message: string): Promise<string> => {
  try {
    // Call the Supabase edge function to generate a title
    const { data, error } = await supabase.functions.invoke('streamline-ai', {
      body: {
        messages: [
          { 
            role: 'system', 
            content: 'Generate a short, concise title (max 5 words) for this conversation based on the user message. Return ONLY the title without quotes or additional text.' 
          },
          { role: 'user', content: message }
        ]
      }
    });
    
    if (error) throw error;
    
    if (data?.response) {
      // Clean up the title by removing quotes and limiting length
      const title = data.response
        .replace(/^["']|["']$/g, '') // Remove quotes
        .substring(0, 50); // Limit length
      
      return title;
    }
  } catch (e) {
    console.error("Error generating chat title:", e);
  }
  
  // Fallback title
  return message.substring(0, 30) + (message.length > 30 ? "..." : "");
};
