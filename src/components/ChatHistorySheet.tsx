import { useChatContext } from "../contexts/ChatContext";
import { formatDate } from "../utils/chatUtils";
import { Button } from "@/components/ui/button";
import { MessageSquare, PlusCircle, LogOut, Search } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Chat } from "../types/chat";

const ChatHistorySheet = ({
  onClose
}: {
  onClose?: () => void;
}) => {
  const {
    chats,
    currentChatId,
    selectChat,
    createNewChat
  } = useChatContext();
  
  const { user, signOut } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter chats based on search term
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Group chats by recency
  const getLast7DaysChats = () => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return filteredChats.filter(chat => {
      // Convert string timestamps to numbers for comparison
      const updatedAt = typeof chat.updatedAt === 'string' ? 
        new Date(chat.updatedAt).getTime() : 
        Number(chat.updatedAt);
      return updatedAt > oneWeekAgo;
    }).sort((a, b) => {
      // Convert string timestamps to numbers for sorting
      const aUpdated = typeof a.updatedAt === 'string' ? 
        new Date(a.updatedAt).getTime() : 
        Number(a.updatedAt);
      const bUpdated = typeof b.updatedAt === 'string' ? 
        new Date(b.updatedAt).getTime() : 
        Number(b.updatedAt);
      return bUpdated - aUpdated;
    });
  };
  
  const getOlderChats = () => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const currentYear = new Date().getFullYear();
    return filteredChats.filter(chat => {
      // Convert string timestamps to numbers for comparison
      const updatedAt = typeof chat.updatedAt === 'string' ? 
        new Date(chat.updatedAt).getTime() : 
        Number(chat.updatedAt);
      const chatYear = new Date(updatedAt).getFullYear();
      return updatedAt < oneWeekAgo && chatYear === currentYear;
    }).sort((a, b) => {
      // Convert string timestamps to numbers for sorting
      const aUpdated = typeof a.updatedAt === 'string' ? 
        new Date(a.updatedAt).getTime() : 
        Number(a.updatedAt);
      const bUpdated = typeof b.updatedAt === 'string' ? 
        new Date(b.updatedAt).getTime() : 
        Number(b.updatedAt);
      return bUpdated - aUpdated;
    });
  };
  
  const handleCreateNewChat = async () => {
    await createNewChat();
    if (onClose) onClose();
  };
  
  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    if (onClose) onClose();
  };
  
  const recentChats = getLast7DaysChats();
  const olderChats = getOlderChats();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                Actions
              </h3>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 mb-2" 
                onClick={handleCreateNewChat}
              >
                <PlusCircle size={16} />
                Create new private chat
              </Button>
            </div>

            {recentChats.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  Last 7 Days
                </h3>
                <div className="space-y-1">
                  {recentChats.map(chat => (
                    <Button 
                      key={chat.id} 
                      variant={currentChatId === chat.id ? "secondary" : "ghost"} 
                      className="w-full justify-start text-left text-sm h-auto py-2" 
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="flex items-center gap-2 w-full overflow-hidden">
                        <MessageSquare size={16} />
                        <span className="truncate">{chat.title}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {olderChats.length > 0 && (
              <div className="mb-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">
                  This Year
                </h3>
                <div className="space-y-1">
                  {olderChats.map(chat => (
                    <Button 
                      key={chat.id} 
                      variant={currentChatId === chat.id ? "secondary" : "ghost"} 
                      className="w-full justify-start text-left text-sm h-auto py-2" 
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="flex items-center gap-2 w-full overflow-hidden">
                        <MessageSquare size={16} />
                        <span className="truncate">{chat.title}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {filteredChats.length === 0 && (
              <div className="text-center p-4 text-muted-foreground">
                No chat history found
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ChatHistorySheet;
