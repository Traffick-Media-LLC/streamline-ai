import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useChatState } from "@/hooks/useChatState";
import { formatDate } from "@/utils/chatUtils";
import { toast } from "@/hooks/use-toast";

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
  const [isClearing, setIsClearing] = useState(false);
  const {
    threads,
    currentThreadId,
    deleteThread
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

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      // Delete all threads
      await Promise.all(threads.map(thread => deleteThread(thread.id)));
      toast({
        title: "Chat history cleared",
        description: "All conversations have been deleted successfully."
      });
    } catch (error) {
      console.error("Error clearing chat history:", error);
      toast({
        title: "Error",
        description: "Failed to clear chat history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-semibold">Chat History</h3>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={threads.length === 0 || isClearing}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear Chat History</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear all chat history? This action cannot be undone and will permanently delete all your conversations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearAll}
                disabled={isClearing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isClearing ? "Clearing..." : "Clear All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
                    variant={currentThreadId === thread.id ? "secondary" : "ghost"}
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
