
import { useChatContext } from "../contexts/ChatContext";
import { Message } from "../types/chat"; // Add this import
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Animated, AnimatedList } from "@/components/ui/animated";
import { useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";

// Extend Message type for internal use to include animation delay
type MessageWithAnimation = Message & { animationDelay?: number };

const ChatWindow = () => {
  const {
    getCurrentChat,
    isLoadingResponse,
    isInitializing,
    clearChat,
    chats,
    currentChatId,
    fetchChats
  } = useChatContext();
  
  const {
    user
  } = useAuth();
  
  const currentChat = getCurrentChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current && currentChat?.messages.length) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      }, 100);
    }
  }, [currentChat?.messages.length]);

  // Clear chat when component is mounted
  useEffect(() => {
    clearChat();
  }, [clearChat]);

  // Get user's name from auth context
  const userName = useMemo(() => {
    if (!user) return '';

    // Try to get name from user metadata (Google auth stores it here)
    const fullName = user.user_metadata?.full_name || `${user.user_metadata?.given_name || ''} ${user.user_metadata?.family_name || ''}`.trim();

    // If we have a full name, return the first name
    if (fullName) {
      const firstName = fullName.split(' ')[0];
      return firstName || '';
    }
    return '';
  }, [user]);

  // Calculate optimized messages array with staggered animation delays
  const optimizedMessages = useMemo(() => {
    if (!currentChat) return [];
    
    console.log("Current chat messages:", currentChat.messages);
    
    // Only apply staggered animations to the most recent messages (up to 5)
    const messages = [...currentChat.messages] as MessageWithAnimation[];
    const messageCount = messages.length;

    // Apply stagger to last few messages only
    if (messageCount > 5) {
      const staggerCount = Math.min(3, messageCount);
      const startIndex = messageCount - staggerCount;
      for (let i = startIndex; i < messageCount; i++) {
        messages[i] = {
          ...messages[i],
          animationDelay: (i - startIndex) * 0.15
        };
      }
    }
    return messages;
  }, [currentChat]);

  // Log current state for debugging
  useEffect(() => {
    console.log("ChatWindow state:", {
      currentChatId,
      hasChat: !!currentChat,
      messageCount: currentChat?.messages?.length || 0,
      chatsCount: chats?.length || 0,
      userId: user?.id
    });
  }, [currentChat, currentChatId, chats, user]);

  // Handle chat refresh
  const handleRefresh = () => {
    fetchChats();
    toast.success("Chat data refreshed");
  };

  if (isInitializing) {
    return <div className="flex items-center justify-center h-full">
        <Animated type="scale">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading chats...</p>
          </div>
        </Animated>
      </div>;
  }

  if (!currentChat) {
    return <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-6">
        <Animated type="slide-up" delay={0.1}>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-streamline-red to-streamline-darkGray">
            {userName ? `Hey, ${userName}` : "Hey, there!"}
          </h1>
        </Animated>
        
        <Animated type="slide-up" delay={0.2}>
          <h2 className="text-2xl font-medium text-foreground/90">I'm Max, your personal Streamline assistant</h2>
        </Animated>
        
        <Animated type="fade" delay={0.3} className="max-w-md">
          <p className="text-base text-foreground/80">
            Start a new chat to get legal guidance on topics related to nicotine, 
            hemp-derived cannabinoids, kratom, and other regulated industries.
          </p>
        </Animated>

        {user && chats.length > 0 && (
          <Animated type="fade" delay={0.4}>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              className="mt-4 flex items-center gap-2">
              <RefreshCw size={16} />
              Refresh Chats
            </Button>
          </Animated>
        )}
      </div>;
  }

  return <div className="flex-1 h-full overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 min-h-full">
          {currentChat?.messages.length === 0 ? <Animated type="fade" className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-lg text-muted-foreground font-medium">
                Ask a question to start the conversation
              </p>
            </Animated> : <div className="space-y-6">
              {optimizedMessages.map(message => <Animated key={message.id} type={message.role === 'user' ? 'slide-in' : 'fade'} delay={message.animationDelay || 0} threshold={0.01}>
                  <ChatMessage message={message} />
                </Animated>)}
              <div ref={scrollRef} />
            </div>}
          {isLoadingResponse && <Animated type="fade">
              <TypingIndicator />
            </Animated>}
        </div>
      </ScrollArea>
    </div>;
};

export default ChatWindow;
