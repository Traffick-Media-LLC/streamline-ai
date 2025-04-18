import { useChatContext } from "../contexts/ChatContext";
import { formatDate } from "../utils/chatUtils";
import { Button } from "@/components/ui/button";
import { MessageSquare, PlusCircle, Settings, HelpCircle, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';

const ChatHistory = ({ onClose, isMobile }: { onClose?: () => void; isMobile?: boolean }) => {
  const { chats, currentChatId, selectChat, createNewChat } = useChatContext();
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState<{ first_name?: string; last_name?: string }>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        setUserProfile(profile);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

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

  const sortedDates = Object.keys(chatsByDate).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const getUserInitials = () => {
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name[0]}${userProfile.last_name[0]}`;
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (userProfile.first_name && userProfile.last_name) {
      return `${userProfile.first_name} ${userProfile.last_name}`;
    }
    return user?.email?.split('@')[0] || "User";
  };

  return (
    <div className="flex flex-col flex-1">
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

      <div className="px-2 py-1">
        <h2 className="text-sm font-medium text-muted-foreground">Chat History</h2>
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

      <div className="border-t p-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {user?.user_metadata?.avatar_url ? (
                <AvatarImage src={user.user_metadata.avatar_url} alt="User avatar" />
              ) : null}
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div className="text-sm font-medium truncate max-w-[120px]">
              {getUserDisplayName()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => navigate('/profile')}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHistory;
