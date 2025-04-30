
import { useRef, useEffect, Fragment } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useChatContext } from "../contexts/ChatContext";
import { Message } from "../types/chat";
import { useAuth } from "@/contexts/AuthContext";
import FileSearchResults from "./FileSearchResults";

// Component to display a single message
const ChatMessage = ({ message }: { message: Message }) => {
  const formatContent = (content: string) => {
    // Convert Markdown links to HTML
    let formatted = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">$1</a>');
    
    // Convert line breaks to <br> tags
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  };

  return (
    <div
      className={`p-4 ${
        message.role === "user" ? "bg-muted/50" : "bg-background"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {message.role === "user" ? "U" : "A"}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">
              {message.role === "user" ? "You" : "Assistant"}
            </p>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />
            
            {/* File search results */}
            {message.referencedDocuments && message.referencedDocuments.length > 0 && (
              <FileSearchResults 
                results={message.referencedDocuments.map(doc => ({
                  id: doc.id,
                  name: doc.name,
                  fileType: 'Document',
                  webLink: doc.webLink
                }))}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatWindow = () => {
  const { getCurrentChat, isLoadingResponse } = useChatContext();
  const { isGuest, user } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const chat = getCurrentChat();
  const messages = chat?.messages || [];

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  }, [messages, isLoadingResponse]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="min-h-full">
          {/* Empty state */}
          {messages.length === 0 && !isLoadingResponse && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-4">
                <h2 className="text-2xl font-semibold">
                  Welcome to the Streamline Group Assistant
                </h2>
                <p className="text-muted-foreground">
                  Ask me questions about products, files, or company resources.
                </p>
                <div className="border rounded-md p-4 bg-muted/20">
                  <p className="text-sm text-left font-medium mb-2">Try asking:</p>
                  <ul className="text-sm text-left space-y-2 text-muted-foreground">
                    <li>"Is Delta-8 legal in Texas?"</li>
                    <li>"Find me the Galaxy Treats logo"</li>
                    <li>"Where can I find the marketing request form?"</li>
                    <li>"Search for Juice Head POS materials"</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, i) => (
            <Fragment key={message.id}>
              <ChatMessage message={message} />
              {i < messages.length - 1 && <div className="border-t" />}
            </Fragment>
          ))}

          {/* Loading state */}
          {isLoadingResponse && (
            <>
              {messages.length > 0 && <div className="border-t" />}
              <div className="p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                      A
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">Assistant</p>
                      <div className="flex items-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatWindow;
