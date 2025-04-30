
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Database, FileText, X } from "lucide-react";
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

// Panel showing active documents
const DocumentPanel = () => {
  const { getDocumentContext, setDocumentContext } = useChatContext();
  const [documentNames, setDocumentNames] = useState<Record<string, string>>({});
  const documentIds = getDocumentContext();
  
  useEffect(() => {
    // Fetch document names when IDs change
    const fetchDocumentNames = async () => {
      if (!documentIds || documentIds.length === 0) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('drive-integration', {
          body: { 
            operation: 'list', 
            limit: documentIds.length * 2 // Get more than we need to ensure all IDs are covered
          },
        });
        
        if (error) throw error;
        
        const nameMap: Record<string, string> = {};
        
        // Create a map of id -> name for all fetched documents
        for (const doc of data?.files || []) {
          if (documentIds.includes(doc.id)) {
            nameMap[doc.id] = doc.name;
          }
        }
        
        setDocumentNames(nameMap);
      } catch (err) {
        console.error("Error fetching document names:", err);
      }
    };
    
    fetchDocumentNames();
  }, [documentIds]);
  
  if (!documentIds || documentIds.length === 0) return null;
  
  return (
    <div className="flex items-center px-4 py-2 bg-muted/50 text-sm border-b">
      <div className="mr-2 text-muted-foreground flex items-center">
        <FileText size={14} className="mr-1" />
        <span>Active documents:</span>
      </div>
      <div className="flex flex-wrap gap-2 flex-1">
        {documentIds.map(docId => (
          <div 
            key={docId} 
            className="bg-background border px-2 py-0.5 rounded-full flex items-center text-xs"
          >
            <span className="truncate max-w-[150px]">
              {documentNames[docId] || docId.substring(0, 8)}
            </span>
            <button 
              onClick={() => setDocumentContext(documentIds.filter(id => id !== docId))}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => setDocumentContext([])}
        className="ml-2 text-xs h-7"
      >
        Clear all
      </Button>
    </div>
  );
};

const ChatPageContent = () => {
  const { user } = useAuth();
  const { getDocumentContext } = useChatContext();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const documentIds = getDocumentContext();
  
  // Check connection to Edge Function
  useEffect(() => {
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
  
  // Render debugging panel (development only)
  const renderDebugPanel = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground">Status: {debugInfo || "Ready"}</p>
        {documentIds.length > 0 && (
          <p className="text-xs text-muted-foreground">{documentIds.length} active documents</p>
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

        {/* Document panel - shows when documents are active */}
        {documentIds.length > 0 && <DocumentPanel />}

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
