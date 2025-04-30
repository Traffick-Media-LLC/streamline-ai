import { useState, useRef, useEffect } from "react";
import { Send, FileText, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/contexts/ChatContext";
import { Textarea } from "@/components/ui/textarea";
import DocumentSelector from "./DocumentSelector";
import { toast } from "@/components/ui/sonner";
import FileSearchBar from "./FilesearchBar";
import { Badge } from "@/components/ui/badge";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const docSelectorRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  
  const { 
    sendMessage, 
    isLoadingResponse, 
    setDocumentContext, 
    getDocumentContext,
    sharedDriveId,
    showDriveSetupInstructions
  } = useChatContext();

  const selectedDocuments = getDocumentContext();

  const handleSubmit = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage(message);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Close document selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        docSelectorRef.current &&
        !docSelectorRef.current.contains(event.target as Node)
      ) {
        setShowDocSelector(false);
      }

      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target as Node)
      ) {
        setShowFileSearch(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDocSelector = () => {
    setShowDocSelector(!showDocSelector);
    // Close file search if opening doc selector
    if (!showDocSelector) {
      setShowFileSearch(false);
    }
  };

  const toggleFileSearch = () => {
    setShowFileSearch(!showFileSearch);
    // Close doc selector if opening file search
    if (!showFileSearch) {
      setShowDocSelector(false);
    }
    
    // Show Google Drive setup instructions if the search is being opened
    // This helps users understand why search might not be working
    if (!showFileSearch && !sharedDriveId) {
      setTimeout(() => {
        if (showDriveSetupInstructions) {
          showDriveSetupInstructions();
        }
      }, 500);
    }
  };

  return (
    <div className="border-t p-4 relative">
      <div className="max-w-3xl mx-auto">
        {/* Document selector popup */}
        {showDocSelector && (
          <div
            ref={docSelectorRef}
            className="absolute bottom-full mb-2 w-full max-w-3xl z-10"
          >
            <div className="p-4 rounded-md bg-muted/30 backdrop-blur-sm border shadow-lg h-80">
              <h3 className="text-sm font-medium mb-2">Select documents:</h3>
              <DocumentSelector
                selectedDocuments={selectedDocuments}
                onSelectDocument={setDocumentContext}
                sharedDriveId={sharedDriveId}
              />
            </div>
          </div>
        )}

        {/* File search popup */}
        {showFileSearch && (
          <div
            ref={searchBarRef}
            className="absolute bottom-full mb-2 w-full max-w-3xl z-10"
          >
            <div className="p-4 rounded-md bg-muted/30 backdrop-blur-sm border shadow-lg">
              <h3 className="text-sm font-medium mb-2">Search Google Drive files:</h3>
              <FileSearchBar />
              <p className="text-xs text-muted-foreground mt-2">
                Search for files directly or ask in chat: "Find Galaxy Treats logo"
              </p>
            </div>
          </div>
        )}

        {/* Display selected documents */}
        {selectedDocuments.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {selectedDocuments.map((docId) => (
              <Badge
                key={docId}
                variant="secondary"
                className="gap-1 text-xs py-0 pr-1"
              >
                <FileText size={12} />
                <span>{docId.substring(0, 8)}...</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setDocumentContext(
                      selectedDocuments.filter((id) => id !== docId)
                    )
                  }
                >
                  <X size={10} />
                </Button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDocumentContext([])}
            >
              Clear all
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={showDocSelector ? "bg-muted" : ""}
              onClick={toggleDocSelector}
              title="Select documents"
            >
              <FileText size={18} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className={showFileSearch ? "bg-muted" : ""}
              onClick={toggleFileSearch}
              title="Search files"
            >
              <Search size={18} />
            </Button>
          </div>

          <div className="flex-1 flex items-end gap-2">
            <Textarea
              ref={textAreaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 min-h-[80px] max-h-[240px] resize-none"
              disabled={isLoadingResponse}
            />
            <Button
              onClick={handleSubmit}
              disabled={!message.trim() || isLoadingResponse}
              className="flex-shrink-0"
              size="icon"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
