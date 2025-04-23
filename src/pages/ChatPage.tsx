
import { useState, useEffect } from "react";
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

  useEffect(() => {
    // Add debugging to check what's happening during initialization
    console.log("ChatPage mounted, initializing...");
    
    const debugTimeout = setTimeout(() => {
      // This will execute after the component has had time to initialize
      setIsLoading(false);
      console.log("ChatPage debug timeout completed");
      
      // Check if ChatProvider context is functioning
      setDebugInfo("ChatProvider initialization completed");
    }, 2000); // 2 seconds should be enough for normal initialization
    
    return () => clearTimeout(debugTimeout);
  }, []);

  // Debug panel that displays temporarily to help diagnose issues
  const renderDebugPanel = () => {
    if (!isLoading) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground">Status: {isLoading ? "Initializing..." : "Ready"}</p>
        <p className="text-xs text-muted-foreground">{debugInfo}</p>
      </div>
    );
  };

  return (
    <ChatProvider>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
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
              <ChatWindow />
              <ChatInput />
            </div>
          </div>
        </div>
      </div>
      {renderDebugPanel()}
    </ChatProvider>
  );
};

export default ChatPage;
