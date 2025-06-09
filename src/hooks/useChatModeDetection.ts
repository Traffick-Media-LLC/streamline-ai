
import { useMemo } from 'react';

export type ChatMode = 'general' | 'drive-search';

export const useChatModeDetection = () => {
  const detectMode = useMemo(() => {
    return (query: string): ChatMode => {
      const lowerQuery = query.toLowerCase();
      
      // Document/file related keywords for drive search
      const documentKeywords = [
        'document', 'file', 'pdf', 'report', 'certificate', 'lab', 'test', 'coa',
        'brochure', 'brochures', 'sales', 'sheet', 'sheets', 'material', 'materials',
        'marketing', 'flyer', 'flyers', 'catalog', 'spec', 'specs', 'datasheet',
        'sales sheet', 'sales sheets', 'find me', 'show me', 'get me', 'download',
        'attachment', 'attachments', 'paperwork', 'documentation'
      ];
      
      // Check for document queries first (most specific)
      const isDocumentQuery = documentKeywords.some(keyword => lowerQuery.includes(keyword));
      if (isDocumentQuery) {
        return 'drive-search';
      }
      
      // Default to general for everything else (including legality queries)
      return 'general';
    };
  }, []);

  return { detectMode };
};
