
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

// Panel showing active documents
const DocumentPanel = () => {
  const { getDocumentContext, setDocumentContext } = useChatContext();
  const documentIds = getDocumentContext();
  
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
            <span className="truncate max-w-[150px]">{docId}</span>
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
  
  // Render debugging panel (development only)
  const renderDebugPanel = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground">Status: Ready</p>
        <p className="text-xs text-muted-foreground">{debugInfo}</p>
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
            <ChatWindow />
            <ChatInput />
          </div>
        </div>
      </div>
      {renderDebugPanel()}
    </div>
  );
};

const ChatPage = () => {
  return (
    <ChatProvider>
      <ChatPageContent />
    </ChatProvider>
  );
};

export default ChatPage;
