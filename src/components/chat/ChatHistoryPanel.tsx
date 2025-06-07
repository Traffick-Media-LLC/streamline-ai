import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatState } from "@/hooks/useChatState";
import { formatDate } from "@/utils/chatUtils";
interface ChatHistoryPanelProps {
  onClose: () => void;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
}
const ChatHistoryPanel = ({
  onClose,
  onSelectThread,
  onNewChat
}: ChatHistoryPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const {
    threads,
    currentThreadId
  } = useChatState();

  // Filter out empty conversations and group by date
  const nonEmptyThreads = threads.filter(thread => thread.messages.length > 0 || thread.title !== "New Conversation");
  const groupedThreads = nonEmptyThreads.reduce<Record<string, typeof nonEmptyThreads>>((acc, thread) => {
    const date = formatDate(new Date(thread.updatedAt).getTime());
    if (!acc[date]) acc[date] = [];
    acc[date].push(thread);
    return acc;
  }, {});

  // Filter threads by search query
  const filteredGroups = Object.entries(groupedThreads).filter(([date, dateThreads]) => {
    if (!searchQuery) return true;
    return dateThreads.some(thread => thread.title.toLowerCase().includes(searchQuery.toLowerCase()));
  });
  const handleSelectThread = (threadId: string) => {
    onSelectThread(threadId);
  };
  return <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">Chat History</h3>
        
      </div>
      
      <div className="p-3">
        <Button variant="outline" className="w-full justify-start" onClick={onNewChat}>
          + New Chat
        </Button>
      </div>
      
      <div className="px-3 pb-2">
        <Input placeholder="Search conversations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full" />
      </div>
      
      <div className="flex-1 overflow-y-auto p-3">
        {filteredGroups.length === 0 ? <div className="p-4 text-center text-muted-foreground">
            No conversations found
          </div> : filteredGroups.map(([date, dateThreads]) => <div key={date} className="mb-4">
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">{date}</h4>
              <div className="space-y-1">
                {dateThreads.map(thread => <Button key={thread.id} variant={currentThreadId === thread.id ? "secondary" : "ghost"} className="w-full justify-start truncate py-2 text-left" onClick={() => handleSelectThread(thread.id)}>
                    {thread.title}
                  </Button>)}
              </div>
            </div>)}
      </div>
    </div>;
};
export default ChatHistoryPanel;