
import { useChatContext } from "../contexts/ChatContext";
import ChatMessage from "./ChatMessage";
import TypingIndicator from "./TypingIndicator";
import { ScrollArea } from "@/components/ui/scroll-area";

const ChatWindow = () => {
  const { getCurrentChat, isLoadingResponse } = useChatContext();
  const currentChat = getCurrentChat();
  
  if (!currentChat) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-streamline-red to-streamline-darkGray">
          Welcome to Streamline AI
        </h1>
        <h2 className="text-2xl font-medium text-foreground/90">
          Your legal assistant for regulated industries
        </h2>
        <div className="max-w-md">
          <p className="text-base text-foreground/80">
            Start a new chat to get legal guidance on topics related to nicotine, 
            hemp-derived cannabinoids, kratom, and other regulated industries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 min-h-full">
          {currentChat.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-lg text-muted-foreground font-medium">
                Ask a question to start the conversation
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {currentChat.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          )}
          {isLoadingResponse && <TypingIndicator />}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatWindow;
