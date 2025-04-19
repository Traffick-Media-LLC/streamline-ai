
import React from 'react';
import { Source } from '../types/chat';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export const renderTextWithLinks = (text: string, sources?: Source[]) => {
  const parts = text.split(urlRegex);
  
  return (
    <div>
      <div>
        {parts.map((part, index) => {
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
          return <React.Fragment key={index}>{part}</React.Fragment>;
        })}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-2 text-sm text-muted-foreground">
          <strong>Sources:</strong>
          {sources.map((source, index) => (
            <a 
              key={index} 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 text-blue-600 hover:underline"
            >
              {source.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
