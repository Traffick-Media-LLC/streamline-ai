
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import { ChatProvider } from "../contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";

const ChatPage = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const mountedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (mountedRef.current) return;
    mountedRef.current = true;
    
    console.log("ChatPage mounted, initializing...");
    
    // Shorter timeout for initialization
    const debugTimeout = setTimeout(() => {
      console.log("ChatPage timeout completed, setting loading to false");
      setIsLoading(false);
      setDebugInfo("Chat initialization complete");
    }, 1000); 
    
    return () => {
      console.log("ChatPage unmounting, clearing timeout");
      clearTimeout(debugTimeout);
    };
  }, []);

  // Debug panel that displays temporarily to help diagnose issues
  const renderDebugPanel = () => {
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground">Status: {isLoading ? "Initializing..." : "Ready"}</p>
        <p className="text-xs text-muted-foreground">{debugInfo}</p>
        <button 
          onClick={() => setIsLoading(false)} 
          className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded mt-1"
        >
          Force Ready
        </button>
      </div>
    );
  };

  return (
    <ChatProvider>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
        {/* Main content */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b flex items-center px-4">
            {user && (
              <div className="ml-auto">
                <Link to="/knowledge">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Database size={16} />
                    Knowledge Manager
                  </Button>
                </Link>
              </div>
            )}
          </header>

          {/* Chat content with max-width container */}
          <div className="flex-1 overflow-hidden flex flex-col items-center">
            <div className="w-full max-w-3xl flex-1 flex flex-col overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading chat...</p>
                  </div>
                </div>
              ) : (
                <>
                  <ChatWindow />
                  <ChatInput />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      {renderDebugPanel()}
    </ChatProvider>
  );
};

export default ChatPage;
