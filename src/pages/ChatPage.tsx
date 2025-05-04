
import { useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import { ChatProvider } from "../contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { useChatContext } from "../contexts/ChatContext";
import { supabase } from "@/integrations/supabase/client";
import ErrorBoundary from "@/components/ErrorBoundary";

const ChatPageContent = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  
  // Check connection to Edge Function
  useState(() => {
    const checkEdgeFunctionConnection = async () => {
      if (process.env.NODE_ENV === 'development') {
        try {
          // Simple health check for the Edge Function
          const startTime = performance.now();
          const { data, error } = await supabase.functions.invoke('chat', {
            body: { mode: "health_check" },
          });
          
          const duration = Math.round(performance.now() - startTime);
          
          if (error) {
            console.error("Edge Function health check failed:", error);
            setDebugInfo(`Edge Function Error: ${error.message || 'Unknown error'}`);
          } else {
            console.log("Edge Function health check passed:", data);
            setDebugInfo(`Edge Function OK (${duration}ms)`);
          }
        } catch (err) {
          console.error("Failed to connect to Edge Function:", err);
          setDebugInfo(`Connection Error: ${err.message || 'Unknown error'}`);
        }
      }
    };
    
    checkEdgeFunctionConnection();
  }, []);
  
  // Render debugging panel (development or when toggled)
  const renderDebugPanel = () => {
    if (process.env.NODE_ENV !== 'development' && !showDebugPanel) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50 max-w-[350px]">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground">Status: {debugInfo || "Ready"}</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background overflow-hidden">
      {/* Main content */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b flex items-center px-4">
          {user && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                title="Toggle Debug Panel"
                className="h-8 w-8"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
              >
                <Settings size={16} />
              </Button>
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
            <ErrorBoundary component="ChatWindow">
              <ChatWindow />
            </ErrorBoundary>
            <ErrorBoundary component="ChatInput">
              <ChatInput />
            </ErrorBoundary>
          </div>
        </div>
      </div>
      {renderDebugPanel()}
    </div>
  );
};

const ChatPage = () => {
  return (
    <ErrorBoundary component="ChatPage">
      <ChatProvider>
        <ChatPageContent />
      </ChatProvider>
    </ErrorBoundary>
  );
};

export default ChatPage;
