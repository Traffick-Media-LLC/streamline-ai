
import React from 'react';

// Regular expressions for detecting different types of content
const urlRegex = /(https?:\/\/[^\s]+)/g;
const boldTitleRegex = /\*\*(.*?)\*\*/g;
const fileExtensionRegex = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|zip|jpg|jpeg|png|gif)(?=\s|$|\)|\])/i;
const logoUrlRegex = /logo|icon|brand.*\.(jpg|jpeg|png|gif|webp|svg)/i;
const markdownLinkRegex = /\[(.*?)\]\((https?:\/\/[^\s]+)\)/g;

// Function to check if a URL is likely a logo image
const isLogoImageUrl = (url: string): boolean => {
  return logoUrlRegex.test(url.toLowerCase());
};

export const renderTextWithLinks = (text: string) => {
  if (!text) return null;

  // First, handle markdown links [text](url)
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Process all markdown-style links first
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      // Process this segment for bold text and direct URLs
      const beforeText = text.slice(lastIndex, match.index);
      parts.push(processTextSegment(beforeText));
    }
    
    // Extract link text and URL from markdown syntax [text](url)
    const [fullMatch, linkText, url] = match;
    
    // Check if this is a logo image to skip
    if (isLogoImageUrl(url)) {
      // Skip logo URLs
      lastIndex = match.index + fullMatch.length;
      continue;
    }
    
    // Add the link with clean styling - underlined and inheriting text color
    parts.push(
      <a 
        key={`ml-${match.index}`}
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="underline hover:no-underline transition-colors"
      >
        {linkText}
      </a>
    );
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text after all markdown links
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    parts.push(processTextSegment(remainingText));
  }
  
  return parts;
};

// Helper function to process text segments for bold and direct URLs
function processTextSegment(text: string) {
  // Process this segment for direct URLs
  const urlParts = text.split(urlRegex);
  
  return urlParts.map((part, index) => {
    // Handle URLs
    if (part.match(urlRegex)) {
      // Check if this appears to be a logo image URL
      if (isLogoImageUrl(part)) {
        // For logo images, don't render the raw URL
        return null;
      }
      
      return (
        <a 
          key={`url-${index}`}
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="underline hover:no-underline transition-colors"
        >
          {part}
        </a>
      );
    }
    
    // For non-URL parts, handle bold text
    const boldParts = part.split(boldTitleRegex);
    return (
      <React.Fragment key={`bp-${index}`}>
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
}

// Function to extract URLs from text
export const extractUrls = (text: string): string[] => {
  return text.match(urlRegex) || [];
};

// Function to check if text has file links
export const hasFileLinks = (text: string): boolean => {
  const urls = extractUrls(text);
  return urls.some(url => fileExtensionRegex.test(url));
};
