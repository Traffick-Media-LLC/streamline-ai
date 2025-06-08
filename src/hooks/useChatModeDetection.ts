
import { useMemo } from 'react';

export type ChatMode = 'document-search' | 'product-legality' | 'general';

export const useChatModeDetection = () => {
  const detectMode = useMemo(() => {
    return (query: string): ChatMode => {
      const lowerQuery = query.toLowerCase();
      
      // Document/file related keywords - prioritize these first
      const documentKeywords = [
        'document', 'file', 'pdf', 'report', 'certificate', 'lab', 'test', 'coa',
        'brochure', 'brochures', 'sales', 'sheet', 'sheets', 'material', 'materials',
        'marketing', 'flyer', 'flyers', 'catalog', 'spec', 'specs', 'datasheet',
        'sales sheet', 'sales sheets', 'find me', 'show me', 'get me'
      ];
      
      // Legality related keywords
      const legalityKeywords = [
        'legal', 'legality', 'allowed', 'permitted', 'can sell', 'can i sell',
        'state law', 'regulation', 'compliance', 'approved', 'authorized'
      ];
      
      // Check for document queries first (most specific)
      const isDocumentQuery = documentKeywords.some(keyword => lowerQuery.includes(keyword));
      if (isDocumentQuery) {
        return 'document-search';
      }
      
      // Check for legality queries
      const isLegalityQuery = legalityKeywords.some(keyword => lowerQuery.includes(keyword));
      if (isLegalityQuery) {
        return 'product-legality';
      }
      
      // Default to general for everything else
      return 'general';
    };
  }, []);

  return { detectMode };
};
