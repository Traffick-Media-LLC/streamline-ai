
import { useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import { ChatProvider } from "../contexts/ChatContext";
import { useAuth } from "@/contexts/AuthContext";

const ChatPage = () => {
  const { user } = useAuth();

  return (
    <ChatProvider>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Main content */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b flex items-center px-4">
            {user && (
              <div className="ml-auto">
                <Link to="/knowledge">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Database size={16} />
                    Knowledge Manager
                  </Button>
                </Link>
              </div>
            )}
          </header>

          {/* Chat content with max-width container */}
          <div className="flex-1 overflow-hidden flex flex-col items-center">
            <div className="w-full max-w-3xl flex-1 flex flex-col overflow-hidden">
              <ChatWindow />
              <ChatInput />
            </div>
          </div>
        </div>
      </div>
    </ChatProvider>
  );
};

export default ChatPage;
