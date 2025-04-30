
// Update the isFileQuery function to better detect file search queries
function isFileQuery(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  const fileKeywords = [
    'file', 'document', 'pdf', 'image', 'picture', 'photo', 'logo', 'sheet',
    'presentation', 'slide', 'deck', 'brochure', 'manual', 'guide', 'form',
    'template', 'spreadsheet', 'report', 'render', 'asset', 'marketing',
    'sales sheet', 'pos kit', 'pos material', 'download', 'upload', 
    'find me', 'locate', 'search for', 'get me', 'look for', 'where is', 
    'need', 'want', 'send me', 'share', 'send the', 'get the'
  ];
  
  const contentLower = content.toLowerCase();
  
  // Check for file request patterns:
  // 1. Direct file type mentions
  if (/\.(pdf|docx?|xlsx?|pptx?|jpg|jpeg|png|gif|zip|csv|txt)\b/i.test(contentLower)) {
    return true;
  }
  
  // 2. Keywords that indicate file searching
  const keywordMatches = fileKeywords.filter(keyword => contentLower.includes(keyword)).length;
  
  // 3. Phrases that suggest looking for specific assets
  const lookingForPatterns = [
    /find (me |)(a |the |)(.+)/i,
    /looking for (a |the |)(.+)/i,
    /need (a |the |)(.+)/i, 
    /where (can I |do I |to |)find (a |the |)(.+)/i,
    /search for (a |the |)(.+)/i,
    /do (you |we |)have (a |the |)(.+)/i
  ];
  
  const matchesPattern = lookingForPatterns.some(pattern => pattern.test(contentLower));
  
  return keywordMatches >= 1 || matchesPattern;
}

// Update the system prompt to explicitly instruct about file links
const baseSystemPrompt = `You are the AI assistant for Streamline Group Employees inside the Streamline Group Portal. 

Your role is to intelligently answer employee questions about product legality, information about Streamline Group's products, employee resources, and company documents.

Follow this strict source hierarchy based on the type of question:

1. If the user asks about product legality or regulatory status by state (e.g., "Is Delta-8 legal in Texas?"), you must check and pull from the Supabase backend database that powers the U.S. State Map.
2. If the user asks general questions about company information (e.g., "What brands does Streamline sell?" or "Where can I find the marketing request form?"), reference the AI Knowledge Base first.
3. If the user asks for specific files, images, logos, product renders, sales sheets, POS kits, or documents (e.g., "Can I find the Alcohol Armor sales sheet?" or "Where is the POS kit for Juice Head?"), then search and retrieve information from the Google Drive integration.

For file queries:
- When files are found, ALWAYS include the direct web links to the files
- Present links in a clear, organized format
- Clearly indicate file types (e.g., PDF, spreadsheet, image)
- Only include the most relevant files (maximum 5)

Understand the context of each question to determine which source to use:
- Never reference Google Drive for questions about product legality.
- Always use the Supabase backend for product legality first.
- Use the Knowledge Base for broader company questions.
- Use the Google Drive integration only for locating files and assets.

${referencedSources.length > 0 ? 
  `For this question, the following sources were referenced: ${referencedSources.join(', ')}.` : 
  'No specific sources were found for this question.'}

Always cite your sources where appropriate (e.g., 'According to the State Map data...' or 'This document is retrieved from the Streamline Group Drive').

Answer in a professional, clear, and helpful tone. If you cannot find an answer from the available sources, politely let the user know and suggest submitting a request via the Marketing Request Form or contacting the appropriate department.`;

// Update document search handling to extract file information better
if (documentEntries?.length > 0) {
  // Simple heuristic to find document references with improved link handling
  const assistantMessage = data.choices[0].message.content;
  documentEntries.forEach(doc => {
    const docName = doc.title.replace('Document: ', '');
    const webLink = doc.webLink;
    
    // Check if the document is referenced in the response
    if (assistantMessage.includes(docName)) {
      referencedDocuments.push({
        id: doc.file_id,
        name: docName,
        webLink: webLink // Include the web link
      });
    }
  });
  
  await logEvent(supabase, requestId, 'document_references_extracted', 'chat_function', 
    `Extracted ${referencedDocuments.length} document references from response`, {
      metadata: {
        referencedDocuments: referencedDocuments.map(d => ({name: d.name, hasLink: !!d.webLink}))
      },
      category: 'document'
  });
}

// Add function to extract file search queries from the message
function extractFileSearchQuery(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  // Common patterns for file search
  const patterns = [
    /find (me |)(a |the |)(.+)/i,
    /looking for (a |the |)(.+)/i,
    /search for (a |the |)(.+)/i,
    /where (can I |do I |to |)find (a |the |)(.+)/i,
    /need (a |the |)(.+) (file|document|logo|image|sheet)/i,
    /get (me |)(a |the |)(.+) (file|document|logo|image|sheet)/i
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[3]) {
      // Extract the search term, removing common stopwords at the end
      const searchTerm = match[3].replace(/(file|document|logo|image|sheet|please|thanks)$/i, '').trim();
      if (searchTerm.length > 2) {
        return searchTerm;
      }
    }
  }
  
  return null;
}
