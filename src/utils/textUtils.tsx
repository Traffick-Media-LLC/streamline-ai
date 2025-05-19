import React from 'react';

// Regular expressions for detecting different types of content
const urlRegex = /(https?:\/\/[^\s]+)/g;
const boldTitleRegex = /\*\*(.*?)\*\*/g;
const fileExtensionRegex = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|jpg|jpeg|png|gif)(?=\s|$|\)|\])/i;
const logoUrlRegex = /logo|icon|brand.*\.(jpg|jpeg|png|gif|webp|svg)/i;
const markdownImageRegex = /!\[(.*?)\]\((https?:\/\/[^\s]+)\)/g;

// Function to check if a URL is likely a logo image
const isLogoImageUrl = (url: string): boolean => {
  return logoUrlRegex.test(url.toLowerCase());
};

export const renderTextWithLinks = (text: string) => {
  // First, remove any markdown image syntax for logo URLs
  text = text.replace(markdownImageRegex, (match, altText, url) => {
    if (isLogoImageUrl(url)) {
      return ''; // Remove the entire markdown image syntax
    }
    return match; // Keep non-logo image markdown
  });
  
  // Split by URLs but keep them
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    // Handle URLs
    if (part.match(urlRegex)) {
      // Check if this appears to be a logo image URL
      if (isLogoImageUrl(part)) {
        // For logo images, don't render the raw URL
        return null;
      }
      
      // Determine if this is likely a file link
      const isFileLink = fileExtensionRegex.test(part);
      
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className={`${isFileLink ? 'text-green-600' : 'text-blue-600'} hover:underline hover:text-blue-800 font-medium transition-colors flex items-center`}
        >
          {part}
          <span className="inline-block ml-1">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </span>
        </a>
      );
    }
    
    // For non-URL parts, handle bold text
    const boldParts = part.split(boldTitleRegex);
    return (
      <React.Fragment key={index}>
        {boldParts.map((text, boldIndex) => {
          // Every even index in boldParts array is the content between ** **
          return boldIndex % 2 === 0 ? (
            <React.Fragment key={boldIndex}>{text}</React.Fragment>
          ) : (
            <strong key={boldIndex} className="font-bold">
              {text}
            </strong>
          );
        })}
      </React.Fragment>
    );
  }).filter(Boolean); // Filter out null values (removed logo URLs)
};

// Function to extract URLs from text
export const extractUrls = (text: string): string[] => {
  return text.match(urlRegex) || [];
};

// Function to check if text has file links
export const hasFileLinks = (text: string): boolean => {
  const urls = extractUrls(text);
  return urls.some(url => fileExtensionRegex.test(url));
};
