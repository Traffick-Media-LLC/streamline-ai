
import React from 'react';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export const renderTextWithLinks = (text: string) => {
  // Match URLs along with any text inside square brackets preceding them
  const parts = text.split(/(\[[^\]]+\]\(https?:\/\/[^\s\)]+\)|https?:\/\/[^\s]+)/g);
  
  return parts.map((part, index) => {
    // Check if this part matches a markdown link format [text](url)
    const markdownLinkMatch = part.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/);
    if (markdownLinkMatch) {
      const [, linkText, url] = markdownLinkMatch;
      return (
        <a 
          key={index} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline hover:text-blue-800 font-medium transition-colors"
        >
          {linkText}
        </a>
      );
    }
    
    // Check if this part is a plain URL
    if (part.match(/^https?:\/\/[^\s]+$/)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline hover:text-blue-800 font-medium transition-colors"
        >
          {part}
        </a>
      );
    }
    
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};
