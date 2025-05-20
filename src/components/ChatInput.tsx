
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal, PlusCircle } from "lucide-react";
import { useChatContext } from "../contexts/ChatContext";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    sendMessage,
    createNewChat,
    isLoadingResponse,
    currentChatId
  } = useChatContext();
  
  const { isAuthenticated, user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoadingResponse || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      
      if (!isAuthenticated) {
        toast.error("Please sign in to send messages");
        return;
      }
      
      // Log the current state before sending
      console.log("Sending message:", message, "Current chat ID:", currentChatId, "User:", user?.id);
      
      // Always make sure we have a chat to send to
      let chatID = currentChatId;
      if (!chatID) {
        console.log("No current chat, creating new one");
        chatID = await createNewChat();
        if (!chatID) {
          toast.error("Failed to create chat");
          return;
        }
      }
      
      const result = await sendMessage(message);
      console.log("Send message result:", result);
      
      if (result && !result.success) {
        console.error("Error sending message:", result.error);
        toast.error(result.error || "Failed to send message. Please try again.");
      } else if (result && result.success) {
        // Only clear the message if it was sent successfully
        setMessage("");
      }
    } catch (error) {
      console.error("Exception sending message:", error);
      toast.error("Something went wrong sending your message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCreateNewChat = async () => {
    try {
      if (!isAuthenticated) {
        toast.error("Please sign in to create a new chat");
        return;
      }
      
      const chatId = await createNewChat();
      console.log("Created new chat with ID:", chatId);
      setMessage("");
    } catch (error) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to create a new chat");
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
            disabled={isLoadingResponse || isSubmitting} 
          />
          <Button 
            type="submit" 
            size="icon" 
            className="absolute bottom-2 right-2 h-8 w-8" 
            disabled={!message.trim() || isLoadingResponse || isSubmitting}
          >
            <SendHorizontal size={16} />
          </Button>
        </div>
        <div className="flex justify-center">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCreateNewChat} 
            className="flex items-center gap-2"
            disabled={isLoadingResponse || isSubmitting}
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
