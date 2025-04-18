
import { useChatContext } from "../contexts/ChatContext";
import { formatDate } from "../utils/chatUtils";
import { Button } from "@/components/ui/button";
import { MessageSquare, X, PlusCircle } from "lucide-react";

const ChatHistory = ({
  onClose,
  isMobile,
}: {
  onClose?: () => void;
  isMobile?: boolean;
}) => {
  const { chats, currentChatId, selectChat, createNewChat } = useChatContext();

  // Group chats by date
  const chatsByDate = chats.reduce<Record<string, typeof chats>>(
    (acc, chat) => {
      const date = formatDate(chat.createdAt);
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(chat);
      return acc;
    },
    {}
  );

  // Sort dates newest to oldest
  const sortedDates = Object.keys(chatsByDate).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold">Chat History</h2>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        )}
      </div>
      
      <div className="p-2">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2" 
          onClick={() => {
            createNewChat();
            if (isMobile && onClose) onClose();
          }}
        >
          <PlusCircle size={16} />
          New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {sortedDates.length === 0 ? (
          <div className="text-center p-4 text-muted-foreground">
            No chat history yet
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground px-2 mb-1">
                {date}
              </h3>
              <div className="space-y-1">
                {chatsByDate[date].map((chat) => (
                  <Button
                    key={chat.id}
                    variant={currentChatId === chat.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-left text-sm h-auto py-2"
                    onClick={() => {
                      selectChat(chat.id);
                      if (isMobile && onClose) onClose();
                    }}
                  >
                    <div className="flex items-center gap-2 w-full overflow-hidden">
                      <MessageSquare size={16} />
                      <span className="truncate">{chat.title}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatHistory;
