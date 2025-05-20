import { useState, useEffect } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Database, Settings, History } from "lucide-react";
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
import ChatHistory from "../components/ChatHistory";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ErrorTracker } from "@/utils/logging";

const ChatPageContent = () => {
  const { user } = useAuth();
  const { clearChat, currentChatId, chats } = useChatContext();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(process.env.NODE_ENV === 'development');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [healthCheckStatus, setHealthCheckStatus] = useState<string>("Not checked");
  const [testResponse, setTestResponse] = useState<string>("");
  const isMobile = useIsMobile();
  
  // Clear chat state when component mounts
  useEffect(() => {
    clearChat();
  }, []);
  
  // Check connection to Edge Function
  useEffect(() => {
    const checkEdgeFunctionConnection = async () => {
      try {
        setHealthCheckStatus("Checking connection...");
        // Simple health check for the Edge Function
        const errorTracker = new ErrorTracker('ChatPage');
        await errorTracker.logStage('edge_function_check', 'start');

        const startTime = performance.now();
        const { data, error } = await supabase.functions.invoke('chat', {
          body: { mode: "health_check" },
        });
        
        const duration = Math.round(performance.now() - startTime);
        
        if (error) {
          console.error("Edge Function health check failed:", error);
          setDebugInfo(`Edge Function Error: ${error.message || 'Unknown error'}`);
          setHealthCheckStatus(`Failed: ${error.message || 'Unknown error'}`);
          await errorTracker.logError(
            "Edge Function health check failed",
            error,
            { duration }
          );
          
          // Only show toast in development mode
          if (process.env.NODE_ENV === 'development') {
            toast.error("Edge function health check failed", {
              description: error.message
            });
          }
        } else {
          console.log("Edge Function health check passed:", data);
          setDebugInfo(`Edge Function OK (${duration}ms)`);
          setHealthCheckStatus(`Connected (${duration}ms)`);
          setTestResponse(JSON.stringify(data, null, 2));
          await errorTracker.logStage('edge_function_check', 'complete', {
            duration,
            response: data
          });
        }
      } catch (err) {
        console.error("Failed to connect to Edge Function:", err);
        setDebugInfo(`Connection Error: ${err.message || 'Unknown error'}`);
        setHealthCheckStatus(`Error: ${err.message || 'Connection failed'}`);
        const errorTracker = new ErrorTracker('ChatPage');
        await errorTracker.logError(
          "Failed to connect to Edge Function",
          err
        );
        
        // Only show toast in development mode
        if (process.env.NODE_ENV === 'development') {
          toast.error("Failed to connect to Edge Function", {
            description: err.message
          });
        }
      }
    };
    
    checkEdgeFunctionConnection();
  }, []);

  const handleTestMessage = async () => {
    try {
      setTestResponse("Testing...");
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          content: "Hello", 
          messages: [{ role: "user", content: "Hello" }],
          mode: "test"
        },
      });

      if (error) {
        setTestResponse(`Error: ${error.message}`);
      } else {
        setTestResponse(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setTestResponse(`Exception: ${err.message}`);
    }
  };
  
  // Debug function to log current state
  const logChatState = () => {
    console.log("Current chat state:", {
      currentChatId,
      chats,
      hasCurrentChat: !!chats.find(c => c.id === currentChatId),
      chatCount: chats.length,
      messageCount: chats.find(c => c.id === currentChatId)?.messages.length || 0
    });
    
    setTestResponse(JSON.stringify({
      currentChatId,
      chats: chats.map(c => ({
        id: c.id,
        title: c.title,
        messageCount: c.messages.length
      })),
      messageCount: chats.find(c => c.id === currentChatId)?.messages.length || 0
    }, null, 2));
  };
  
  // Render debugging panel (development or when toggled)
  const renderDebugPanel = () => {
    if (process.env.NODE_ENV !== 'development' && !showDebugPanel) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50 max-w-[400px] overflow-auto max-h-[50vh]">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground mb-1">Status: {debugInfo || "Ready"}</p>
        <p className="text-xs text-muted-foreground">Edge Function: {healthCheckStatus}</p>
        <p className="text-xs text-muted-foreground">Current Chat ID: {currentChatId || "none"}</p>
        <div className="mt-2 text-xs flex gap-2 flex-wrap">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs h-6 px-2"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-6 px-2"
            onClick={handleTestMessage}
          >
            Test Message
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-6 px-2"
            onClick={logChatState}
          >
            Log State
          </Button>
        </div>
        {testResponse && (
          <div className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-[200px]">
            <pre className="whitespace-pre-wrap">{testResponse}</pre>
          </div>
        )}
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
                title="Chat History"
                className="h-8 w-8"
                onClick={() => setHistoryOpen(true)}
              >
                <History size={16} />
              </Button>
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
      
      {/* History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-[320px] sm:w-[400px] p-0">
          <ChatHistory onClose={() => setHistoryOpen(false)} isMobile={isMobile} />
        </SheetContent>
      </Sheet>
      
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
