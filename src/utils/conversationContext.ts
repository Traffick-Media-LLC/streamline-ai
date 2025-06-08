
import { Message } from '@/types/chat';

export interface ConversationContext {
  lastState?: string;
  lastBrand?: string;
  lastProduct?: string;
  hasLegalQuery?: boolean;
  hasDocumentQuery?: boolean;
}

/**
 * Enhanced conversation context extraction
 */
export const extractEnhancedContext = (messages: Message[]): ConversationContext => {
  const context: ConversationContext = {};
  
  // Look through recent messages (last 10 for better context)
  const recentMessages = messages.slice(-10).reverse();
  
  for (const message of recentMessages) {
    if (message.role === 'user') {
      const content = message.content.toLowerCase();
      
      // Extract state names
      if (!context.lastState) {
        const stateKeywords = [
          'florida', 'california', 'texas', 'new york', 'colorado', 'oregon', 
          'washington', 'nevada', 'michigan', 'illinois', 'massachusetts',
          'arizona', 'maryland', 'new jersey', 'connecticut', 'montana'
        ];
        
        for (const state of stateKeywords) {
          if (content.includes(state)) {
            context.lastState = state.charAt(0).toUpperCase() + state.slice(1);
            break;
          }
        }
      }
      
      // Extract brand mentions
      if (!context.lastBrand) {
        const brandKeywords = [
          'juice head', 'orbital', 'kush', 'cookies', 'raw garden', 'stiiizy',
          'pax', 'storz', 'bickel', 'grenco', 'arizer', 'davinci'
        ];
        
        for (const brand of brandKeywords) {
          if (content.includes(brand)) {
            context.lastBrand = brand;
            break;
          }
        }
      }
      
      // Detect query types
      if (!context.hasLegalQuery) {
        const legalKeywords = ['legal', 'allowed', 'banned', 'law', 'compliance', 'regulation'];
        context.hasLegalQuery = legalKeywords.some(keyword => content.includes(keyword));
      }
      
      if (!context.hasDocumentQuery) {
        const docKeywords = ['document', 'file', 'sales sheet', 'brochure', 'material'];
        context.hasDocumentQuery = docKeywords.some(keyword => content.includes(keyword));
      }
    }
  }
  
  return context;
};
