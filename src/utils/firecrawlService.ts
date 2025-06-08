
/**
 * Firecrawl integration service for legal analysis
 */
export class FirecrawlService {
  private static async makeFirecrawlRequest(url: string, searchTerms: string[]) {
    try {
      // This would integrate with the Firecrawl edge function
      // For now, return a placeholder structure
      console.log('Firecrawl request for:', url, 'with terms:', searchTerms);
      
      return {
        success: true,
        data: {
          content: `Legal information crawled from government sources for: ${searchTerms.join(', ')}`,
          url: url,
          title: 'Government Legal Information'
        }
      };
    } catch (error) {
      console.error('Firecrawl request failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async searchLegalSources(state: string, product: string, query: string) {
    const searchTerms = [state, product, 'cannabis', 'hemp', 'regulation'];
    const govUrl = `https://${state.toLowerCase().replace(' ', '')}.gov`;
    
    return this.makeFirecrawlRequest(govUrl, searchTerms);
  }

  static shouldUseLegalCrawling(query: string): boolean {
    const legalAnalysisKeywords = [
      'why banned', 'why illegal', 'law', 'bill', 'ruling', 'compliance',
      'regulation', 'statute', 'policy', 'legal explanation'
    ];
    
    return legalAnalysisKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }
}
