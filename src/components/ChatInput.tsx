
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, PlusCircle } from "lucide-react";
import { useChatContext } from "../contexts/ChatContext";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const {
    sendMessage,
    createNewChat,
    isLoadingResponse
  } = useChatContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoadingResponse) return;
    await sendMessage(message);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t p-4 bg-background">
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
