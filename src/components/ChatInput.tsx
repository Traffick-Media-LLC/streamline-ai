
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SendHorizontal, PlusCircle, FileText, X } from "lucide-react";
import { useChatContext } from "../contexts/ChatContext";
import ChatModeToggle from "./ChatModeToggle";
import DocumentSelector from "./DocumentSelector";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const [isDocumentSelectorOpen, setIsDocumentSelectorOpen] = useState(false);
  const {
    sendMessage,
    createNewChat,
    isLoadingResponse,
    mode,
    setMode,
    getDocumentContext,
    setDocumentContext
  } = useChatContext();

  const selectedDocuments = getDocumentContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoadingResponse) return;
    await sendMessage(message, selectedDocuments);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSelectDocuments = (docIds: string[]) => {
    setDocumentContext(docIds);
  };

  const removeDocument = (docId: string) => {
    setDocumentContext(selectedDocuments.filter(id => id !== docId));
  };

  return (
    <div className="border-t p-4 bg-background">
      <div className="flex items-center justify-between mb-2">
        <ChatModeToggle mode={mode} onModeChange={setMode} />
        
        <Dialog open={isDocumentSelectorOpen} onOpenChange={setIsDocumentSelectorOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <FileText size={16} />
              {selectedDocuments.length > 0 ? `${selectedDocuments.length} Document${selectedDocuments.length === 1 ? '' : 's'}` : 'Reference Documents'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] h-[550px]">
            <h3 className="font-semibold text-lg mb-4">Select Reference Documents</h3>
            <DocumentSelector 
              selectedDocuments={selectedDocuments} 
              onSelectDocument={handleSelectDocuments} 
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {selectedDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedDocuments.map(docId => (
            <div 
              key={docId}
              className="bg-muted text-xs px-2 py-1 rounded-full flex items-center gap-1"
            >
              <FileText size={12} />
              <span className="truncate max-w-[150px]">{docId}</span>
              <button 
                onClick={() => removeDocument(docId)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <Textarea 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            onKeyDown={handleKeyDown} 
            placeholder="Ask about legal topics in regulated industries..." 
            className="pr-12 resize-none min-h-[80px]" 
            disabled={isLoadingResponse} 
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute bottom-2 right-2 h-8 w-8" 
            disabled={!message.trim() || isLoadingResponse}
          >
            <SendHorizontal size={16} />
          </Button>
        </div>
        <div className="flex justify-center">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => createNewChat()} 
            className="flex items-center gap-2"
            disabled={isLoadingResponse}
          >
            <PlusCircle size={16} />
            New Chat
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
