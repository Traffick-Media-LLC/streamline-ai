
import { useState, useEffect } from "react";
import { Message } from "../types/chat";
import { formatTimestamp } from "../utils/chatUtils";
import { renderTextWithLinks } from "../utils/textUtils";
import { User } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const [formattedTime, setFormattedTime] = useState<string>("");

  useEffect(() => {
    setFormattedTime(formatTimestamp(message.timestamp));
  }, [message.timestamp]);
  
  const isUser = message.role === "user";
  
  return (
    <div className={`flex items-start ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-2 mt-1">
          <img 
            src="/lovable-uploads/ed09009c-763d-4847-b5cb-1d76525bd466.png" 
            alt="AI Assistant"
            className="w-6 h-6 rounded-full"
          />
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        <div 
          className={`
            ${isUser ? "chat-message-user" : "chat-message-assistant"} 
            break-words whitespace-pre-wrap
          `}
        >
          <div className="text-[15px] font-normal leading-relaxed">
            {renderTextWithLinks(message.content)}
          </div>
        </div>
        <span className="text-xs font-medium text-muted-foreground mt-1 px-2">{formattedTime}</span>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 ml-2 mt-1">
          <div className="bg-gray-300 p-1 rounded-full text-white">
            <User size={16} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;

