
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { History, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import ChatHistoryPanel from "@/components/chat/ChatHistoryPanel";
import ChatThread from "@/components/chat/ChatThread";
import TopicCards from "@/components/chat/TopicCards";
import { useChatState } from "@/hooks/useChatState";

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { 
    currentThread,
    currentThreadId,
    threads, 
    isLoading, 
    sendMessage,
    createNewThread
  } = useChatState();

  // Focus input when thread changes
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentThreadId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage(input);
    setInput("");
  };

  const handleHistoryToggle = () => {
    setIsHistoryOpen(!isHistoryOpen);
  };

  const firstMessage = !currentThread || currentThread.messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* Desktop History Panel */}
      {!isMobile && (
        <div 
          className={`border-r bg-background transition-all duration-300 ease-in-out ${
            isHistoryOpen ? "w-80" : "w-0"
          }`}
        >
          {isHistoryOpen && <ChatHistoryPanel onClose={handleHistoryToggle} />}
        </div>
      )}
      
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Header with History Button */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-xl font-semibold">Streamline Assistant</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleHistoryToggle}
            className={isHistoryOpen ? "bg-accent" : ""}
          >
            <History className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Chat Content */}
        <div className="flex-1 overflow-hidden relative">
          {firstMessage ? (
            <div className="flex h-full flex-col items-center justify-center p-6">
              <div className="max-w-2xl text-center">
                <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  Hello{user?.email ? `, ${user.email.split('@')[0]}` : ''}! How can I help you today?
                </h1>
                <p className="mb-8 text-muted-foreground">
                  Ask me anything about product legality, state regulations, company files, or ingredient information.
                </p>
                <TopicCards onSelectTopic={(topic) => setInput(topic)} />
              </div>
            </div>
          ) : (
            <div className="h-full">
              <ChatThread 
                messages={currentThread?.messages || []} 
                isLoading={isLoading}
                chatId={currentThreadId || undefined}
              />
            </div>
          )}
          
          {/* Fixed Input Area */}
          <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about product legality, regulations, or request documents..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!input.trim() || isLoading}
              >
                <SendHorizontal className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Mobile History Panel */}
      {isMobile && (
        <Drawer open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DrawerTrigger asChild className="hidden" />
          <DrawerContent className="max-h-[85vh]">
            <ChatHistoryPanel onClose={() => setIsHistoryOpen(false)} />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default ChatPage;
