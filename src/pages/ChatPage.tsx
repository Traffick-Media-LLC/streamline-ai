
import { useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "../components/Logo";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";
import ChatHistory from "../components/ChatHistory";
import { ChatProvider } from "../contexts/ChatContext";

const ChatPage = () => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  return (
    <ChatProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar for history */}
        <div
          className={`${
            sidebarOpen
              ? "fixed inset-y-0 left-0 z-50 w-64 transform translate-x-0"
              : "fixed inset-y-0 left-0 z-50 w-64 transform -translate-x-full"
          } transition-transform duration-300 ease-in-out md:relative md:translate-x-0 bg-secondary border-r h-full`}
        >
          <div className="flex flex-col h-full">
            <div className="h-14 border-b flex items-center px-4">
              <Logo />
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={20} />
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatHistory onClose={() => setSidebarOpen(false)} isMobile={isMobile} />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b flex items-center px-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
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
