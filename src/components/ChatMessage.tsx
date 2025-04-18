
import { useState, useEffect } from "react";
import { Message } from "../types/chat";
import { formatTimestamp } from "../utils/chatUtils";
import { User, Bot } from "lucide-react";

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
          <div className="bg-streamline-red p-1 rounded-full text-white">
            <Bot size={16} />
          </div>
        </div>
      )}
      
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div className={isUser ? "chat-message-user" : "chat-message-assistant"}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground px-2">{formattedTime}</span>
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
