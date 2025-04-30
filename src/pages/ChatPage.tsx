
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Database, FileText, X, Settings } from "lucide-react";
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
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [driveStatus, setDriveStatus] = useState<{status: string, message?: string}>({status: 'unknown'});
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
  
  const checkDriveConnection = async () => {
    setDebugInfo("Testing Google Drive connection...");
    setDriveStatus({status: 'testing'});
    
    try {
      const { data, error } = await supabase.functions.invoke('drive-integration', {
        body: { 
          operation: 'health_check',
          debug: true // Request detailed debugging info
        },
      });
      
      if (error) {
        setDebugInfo(`Drive Error: ${error.message || 'Unknown error'}`);
        setDriveStatus({status: 'error', message: error.message});
        console.error("Drive connection error:", error);
      } else {
        setDebugInfo(`Drive connected successfully!`);
        setDriveStatus({status: 'success', message: 'Connection successful'});
        console.log("Drive connection successful:", data);
        
        // Now try the test_permissions endpoint as a more direct approach
        const permissionResponse = await supabase.functions.invoke('drive-integration', {
          body: { 
            operation: 'test_permissions',
            debug: true
          },
        });
        
        if (permissionResponse.error) {
          setDebugInfo(`Drive permissions test failed: ${permissionResponse.error.message}`);
          setDriveStatus({status: 'warning', message: 'Connection OK but permission test failed'});
          console.error("Drive permissions test error:", permissionResponse.error);
        } else {
          const userEmail = permissionResponse.data?.user?.emailAddress;
          setDebugInfo(`Drive permissions verified! Connected as: ${userEmail || 'unknown'}`);
          setDriveStatus({
            status: 'success', 
            message: `Connected as: ${userEmail || 'unknown'}`
          });
          
          // Now try to list files as a final test
          await testListFiles();
        }
      }
    } catch (err) {
      setDebugInfo(`Drive API Error: ${err.message || 'Unknown error'}`);
      setDriveStatus({status: 'error', message: err.message});
      console.error("Drive connection error:", err);
    }
  };
  
  // Separate function to test listing files
  const testListFiles = async () => {
    try {
      const listResponse = await supabase.functions.invoke('drive-integration', {
        body: { 
          operation: 'list',
          limit: 3,
          debug: true
        },
      });
      
      if (listResponse.error) {
        setDebugInfo(`Drive connected but list failed: ${listResponse.error.message}`);
        setDriveStatus({status: 'warning', message: 'Connected but listing failed'});
        console.error("List files error:", listResponse.error);
        
        // Show more detailed error information
        if (listResponse.error.message.includes('permission')) {
          toast.error("Permission denied: The service account doesn't have access to any files. Share files explicitly with the service account email.");
        } else {
          toast.error(`Failed to list files: ${listResponse.error.message}`);
        }
      } else {
        const fileCount = listResponse.data?.files?.length || 0;
        setDebugInfo(`Drive connected successfully! Found ${fileCount} files.`);
        setDriveStatus({status: 'success', message: `Found ${fileCount} files`});
        
        if (fileCount === 0) {
          toast.warning("No files found. Make sure you've shared at least one file with the service account.");
        } else {
          toast.success(`Successfully found ${fileCount} files in Google Drive.`);
        }
      }
    } catch (err) {
      setDebugInfo(`List files error: ${err.message || 'Unknown error'}`);
      setDriveStatus({status: 'warning', message: 'Connected but listing failed'});
      console.error("List files error:", err);
    }
  };
  
  // Check Drive credentials
  const checkDriveCredentials = async () => {
    setDebugInfo("Checking Google Drive credentials...");
    
    try {
      const credentialTest = await supabase.functions.invoke('drive-integration', {
        body: { 
          operation: 'health_check',
          debug: true, // Request detailed debugging info
          test_credentials: true
        },
      });
      
      if (credentialTest.error) {
        const errorMessage = credentialTest.error.message || 'Unknown error';
        setDebugInfo(`Credential Error: ${errorMessage}`);
        
        // Show a toast with more actionable information
        if (errorMessage.includes("account not found")) {
          toast.error("Google service account not found. Please verify the email address is correct and the account exists.");
        } else if (errorMessage.includes("invalid_grant")) {
          toast.error("Invalid credentials. Check if the service account is enabled and has the right permissions.");
        } else {
          toast.error(`Drive credential error: ${errorMessage}`);
        }
      } else {
        setDebugInfo(`Credentials validated successfully!`);
        toast.success("Google Drive credentials are valid.");
      }
    } catch (err) {
      setDebugInfo(`Credential check error: ${err.message || 'Unknown error'}`);
      toast.error(`Failed to check credentials: ${err.message}`);
    }
  };
  
  // Test sharing permissions
  const testSharingPermissions = async () => {
    setDebugInfo("Testing Google Drive sharing permissions...");
    setDriveStatus({status: 'testing'});
    
    try {
      const { data, error } = await supabase.functions.invoke('drive-integration', {
        body: { 
          operation: 'test_permissions',
          debug: true
        },
      });
      
      if (error) {
        setDebugInfo(`Permission test failed: ${error.message}`);
        setDriveStatus({status: 'error', message: 'Permission test failed'});
        toast.error("Service account doesn't have proper permissions. Check Google Cloud Console.");
        console.error("Permission test error:", error);
      } else {
        const userEmail = data?.user?.emailAddress;
        const displayName = data?.user?.displayName;
        
        setDebugInfo(`Permissions OK! Connected as: ${userEmail || displayName || 'unknown'}`);
        setDriveStatus({status: 'success', message: `Permissions verified for: ${userEmail || 'service account'}`});
        toast.success(`Drive API access confirmed as: ${userEmail || displayName || 'service account'}`);
        
        // Show sharing instructions
        toast.info(
          "To share files with this service account, right-click a file in Google Drive, click 'Share', and add the service account email as a viewer.",
          { duration: 6000 }
        );
      }
    } catch (err) {
      setDebugInfo(`Permission test error: ${err.message || 'Unknown error'}`);
      setDriveStatus({status: 'error', message: 'API error during permission test'});
      console.error("Permission test error:", err);
    }
  };
  
  // Render debugging panel (development or when toggled)
  const renderDebugPanel = () => {
    if (process.env.NODE_ENV !== 'development' && !showDebugPanel) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-background border p-3 rounded-md shadow-md z-50 max-w-[350px]">
        <h4 className="font-medium text-sm">Chat Debug</h4>
        <p className="text-xs text-muted-foreground">Status: {debugInfo || "Ready"}</p>
        
        {documentIds.length > 0 && (
          <p className="text-xs text-muted-foreground">{documentIds.length} active documents</p>
        )}
        
        {driveStatus.status !== 'unknown' && (
          <div className="mt-1 p-1 text-xs rounded bg-muted">
            <span className={`font-medium ${
              driveStatus.status === 'success' ? 'text-green-600' : 
              driveStatus.status === 'error' ? 'text-red-600' : 
              driveStatus.status === 'testing' ? 'text-blue-600' : 'text-amber-600'
            }`}>
              Drive Status: {driveStatus.status}
            </span>
            {driveStatus.message && <p className="text-muted-foreground mt-0.5">{driveStatus.message}</p>}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkDriveConnection}
            className="text-xs h-7"
          >
            Test Drive API
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkDriveCredentials}
            className="text-xs h-7"
          >
            Check Credentials
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={testSharingPermissions}
            className="text-xs h-7"
          >
            Test Permissions
          </Button>
        </div>
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
