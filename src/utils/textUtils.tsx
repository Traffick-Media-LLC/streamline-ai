
import React from 'react';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export const renderTextWithLinks = (text: string) => {
  const parts = text.split(urlRegex);
  
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 hover:underline hover:text-blue-800"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};
