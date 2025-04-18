
import { useEffect, useRef } from "react";
import { useChatContext } from "../contexts/ChatContext";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { getMessagesByDate } from "../utils/chatUtils";
import { formatDate } from "../utils/chatUtils";

const ChatWindow = () => {
  const { getCurrentChat, isLoadingResponse } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChat = getCurrentChat();
  
  // Scroll to bottom when messages change or when loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages, isLoadingResponse]);

  if (!currentChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-streamline-red to-streamline-darkGray">
          Welcome to Streamline AI
        </h1>
        <h2 className="text-xl text-muted-foreground">
          Your legal assistant for regulated industries
        </h2>
        <div className="max-w-md">
          <p className="text-base text-muted-foreground">
            Start a new chat to get legal guidance on topics related to nicotine, 
            hemp-derived cannabinoids, kratom, and other regulated industries.
          </p>
        </div>
      </div>
    );
  }

  const messagesByDate = getMessagesByDate(currentChat.messages);
  const dates = Object.keys(messagesByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {dates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-lg text-muted-foreground font-medium">
            Ask a question to start the conversation
          </p>
        </div>
      ) : (
        dates.map((date) => (
          <div key={date} className="mb-6">
            <div className="flex justify-center mb-4">
              <span className="text-xs font-medium bg-muted/50 text-muted-foreground px-3 py-1 rounded-full">
                {formatDate(new Date(date).getTime())}
              </span>
            </div>
            <div className="space-y-4">
              {messagesByDate[date].map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          </div>
        ))
      )}
      {isLoadingResponse && <TypingIndicator />}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatWindow;
