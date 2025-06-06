
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { History, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
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
    createNewThread,
    selectThread
  } = useChatState();

  // Extract user's display name from Google Auth metadata
  const getUserDisplayName = () => {
    if (!user) return '';
    
    // Try to get full_name from user metadata (Google Auth)
    const fullName = user.user_metadata?.full_name;
    if (fullName) {
      // Extract first name (everything before the first space)
      return fullName.split(' ')[0];
    }
    
    // Fallback to email prefix if no full name
    return user.email ? user.email.split('@')[0] : '';
  };

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

  const handleSelectThread = (threadId: string) => {
    selectThread(threadId);
    setIsHistoryOpen(false);
  };

  const handleNewChat = () => {
    createNewThread();
    setIsHistoryOpen(false);
  };

  const hasActiveChat = currentThread && currentThread.messages.length > 0;
  const showWelcome = !hasActiveChat;
  const displayName = getUserDisplayName();

  return (
    <div className="flex h-[calc(100dvh-64px)] overflow-hidden bg-background">
      {/* Desktop History Panel */}
      {!isMobile && (
        <div className={`border-r bg-background transition-all duration-300 ease-in-out ${isHistoryOpen ? "w-80" : "w-0"}`}>
          {isHistoryOpen && (
            <ChatHistoryPanel 
              onClose={handleHistoryToggle} 
              onSelectThread={handleSelectThread} 
              onNewChat={handleNewChat} 
            />
          )}
        </div>
      )}
      
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Chat Header with History Button */}
        <div className="flex items-center justify-between border-b px-6 py-3 flex-shrink-0 bg-background/95 backdrop-blur">
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
          {showWelcome ? (
            <div className="flex h-full flex-col items-center justify-center p-6 pb-[136px]">
              <div className="max-w-2xl text-center">
                <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
                  Hello{displayName ? `, ${displayName}` : ''}! How can I help you today?
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
          
          {/* Sticky Input Area */}
          <div className="sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-6 min-h-[88px] flex-shrink-0 z-10">
            <div className="max-w-4xl mx-auto">
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
      </div>
      
      {/* Mobile History Panel */}
      {isMobile && (
        <Drawer open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DrawerTrigger asChild className="hidden" />
          <DrawerContent className="max-h-[85vh]">
            <ChatHistoryPanel 
              onClose={() => setIsHistoryOpen(false)} 
              onSelectThread={handleSelectThread} 
              onNewChat={handleNewChat} 
            />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
};

export default ChatPage;
