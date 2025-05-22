
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatState } from "@/hooks/useChatState";
import { formatDate } from "@/utils/chatUtils";

interface ChatHistoryPanelProps {
  onClose: () => void;
}

const ChatHistoryPanel = ({ onClose }: ChatHistoryPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { threads, selectThread, createNewThread } = useChatState();
  
  // Group threads by date
  const groupedThreads = threads.reduce<Record<string, typeof threads>>((acc, thread) => {
    const date = formatDate(new Date(thread.updatedAt).getTime());
    if (!acc[date]) acc[date] = [];
    acc[date].push(thread);
    return acc;
  }, {});

  // Filter threads by search query
  const filteredGroups = Object.entries(groupedThreads).filter(([date, dateThreads]) => {
    if (!searchQuery) return true;
    return dateThreads.some(thread => 
      thread.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleNewChat = () => {
    createNewThread();
    onClose();
  };

  const handleSelectThread = (threadId: string) => {
    selectThread(threadId);
    onClose();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">Chat History</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="p-3">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={handleNewChat}
        >
          + New Chat
        </Button>
      </div>
      
      <div className="px-3 pb-2">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No conversations found
          </div>
        ) : (
          filteredGroups.map(([date, dateThreads]) => (
            <div key={date} className="mb-4">
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">{date}</h4>
              <div className="space-y-1">
                {dateThreads.map(thread => (
                  <Button
                    key={thread.id}
                    variant="ghost"
                    className="w-full justify-start truncate py-2 text-left"
                    onClick={() => handleSelectThread(thread.id)}
                  >
                    {thread.title}
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

export default ChatHistoryPanel;
