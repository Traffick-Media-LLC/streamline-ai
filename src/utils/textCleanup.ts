
/**
 * Enhanced comprehensive text formatting and cleanup utility
 */
export const applyEnhancedComprehensiveFormatCleanup = (text: string): string => {
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
  
  // Fix spacing around colons in lists
  cleaned = cleaned.replace(/:\s*\n\s*-/g, ':\n\n-');
  
  return cleaned.trim();
};

/**
 * Extract conversation context from previous messages
 */
export const extractConversationContext = (messages: any[]): {
  lastState?: string;
  lastBrand?: string;
  lastProduct?: string;
} => {
  const context = {
    lastState: undefined as string | undefined,
    lastBrand: undefined as string | undefined,
    lastProduct: undefined as string | undefined
  };

  // Look through recent messages for state/brand/product mentions
  const recentMessages = messages.slice(-5).reverse();
  
  for (const message of recentMessages) {
    if (message.role === 'user') {
      const content = message.content.toLowerCase();
      
      // Extract state
      if (!context.lastState) {
        const stateMatches = content.match(/\b(florida|california|texas|new york|colorado|oregon|washington|nevada|michigan|illinois|massachusetts|arizona|maryland|new jersey|connecticut|montana|alaska|maine|vermont|rhode island|delaware|hawaii|north dakota|south dakota|nebraska|kansas|oklahoma|arkansas|louisiana|mississippi|alabama|tennessee|kentucky|indiana|ohio|west virginia|virginia|north carolina|south carolina|georgia|wisconsin|minnesota|iowa|missouri|utah|wyoming|idaho|new mexico|pennsylvania|new hampshire)\b/);
        if (stateMatches) {
          context.lastState = stateMatches[1].charAt(0).toUpperCase() + stateMatches[1].slice(1);
        }
      }
      
      // Extract brand (common cannabis brands)
      if (!context.lastBrand) {
        const brandMatches = content.match(/\b(juice head|orbital|kush|cookies|raw garden|stiiizy|pax|storz|bickel|grenco|arizer|davinci|firefly|magic flight|vapir|volcano|crafty|mighty|puffco|dr dabber|kandypens|linx|atmos|snoop dogg|wiz khalifa|cheech|chong)\b/i);
        if (brandMatches) {
          context.lastBrand = brandMatches[1];
        }
      }
    }
  }
  
  return context;
};

/**
 * Group files by category/subcategory for better organization
 */
export const groupFilesByCategory = (files: any[]): { [key: string]: any[] } => {
  const grouped: { [key: string]: any[] } = {};
  
  files.forEach(file => {
    const category = file.subcategory_2 || file.category || 'Other Documents';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(file);
  });
  
  return grouped;
};
