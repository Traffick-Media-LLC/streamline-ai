import React from 'react';

const urlRegex = /(https?:\/\/[^\s]+)/g;
const boldTitleRegex = /\*\*(.*?)\*\*/g;

export const renderTextWithLinks = (text: string) => {
  // First, split by URLs but keep them
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
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
  });
};
