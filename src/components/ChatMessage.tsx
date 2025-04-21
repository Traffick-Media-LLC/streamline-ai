
import { useState, useEffect } from "react";
import { Message } from "../types/chat";
import { formatTimestamp } from "../utils/chatUtils";
import { renderTextWithLinks } from "../utils/textUtils";
import { Copy, Edit } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useChatContext } from "../contexts/ChatContext";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const [formattedTime, setFormattedTime] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const { sendMessage } = useChatContext();

  useEffect(() => {
    setFormattedTime(formatTimestamp(message.timestamp));
  }, [message.timestamp]);
  
  const isUser = message.role === "user";

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast.success("Message copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy message");
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedContent.trim() === "") return;
    
    sendMessage(editedContent);
    setIsEditing(false);
  };
  
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
            break-words whitespace-pre-wrap relative group
          `}
        >
          {isEditing && isUser ? (
            <form onSubmit={handleEditSubmit} className="w-full">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  type="submit"
                >
                  Update
                </Button>
              </div>
            </form>
          ) : (
            <>
              <div className="text-[15px] font-normal leading-relaxed">
                {renderTextWithLinks(message.content)}
              </div>
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyMessage}
                >
                  <Copy size={14} />
                </Button>
                {isUser && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit size={14} />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground mt-1 px-2">{formattedTime}</span>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 ml-2 mt-1">
          <div className="bg-gray-300 p-1 rounded-full text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
