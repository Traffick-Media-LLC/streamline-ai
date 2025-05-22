
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message & { isLoading?: boolean };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        rounded-lg px-4 py-2 max-w-[80%] md:max-w-[70%] lg:max-w-[60%] 
        ${isUser 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-accent text-foreground'}
      `}>
        {message.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
            <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
            <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
        
        {message.metadata?.sourceInfo && (
          <div className="mt-2 text-xs opacity-70">
            Source: {message.metadata.sourceInfo.source}
            {message.metadata.sourceInfo.brand && ` - ${message.metadata.sourceInfo.brand}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
