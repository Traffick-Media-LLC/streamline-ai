
import { Message } from '@/types/chat';
import ChatMessageFeedback from './ChatMessageFeedback';

interface ChatMessageProps {
  message: Message & { isLoading?: boolean };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  // Get the source info for AI messages, if available
  const sourceInfo = !isUser && message.metadata?.sourceInfo;
  
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
          <div>
            <div className="whitespace-pre-wrap">{message.content}</div>
            
            {sourceInfo && (
              <div className="mt-2 text-xs opacity-70">
                {sourceInfo.source === 'product_database' && (
                  <span>Source: State Map Database {sourceInfo.brand && `- ${sourceInfo.brand}`} {sourceInfo.state && `- ${sourceInfo.state}`}</span>
                )}
                {sourceInfo.source === 'internet_knowledge' && (
                  <span>Source: Knowledge Base</span>
                )}
                {sourceInfo.source === 'drive_files' && (
                  <span>Source: Drive Files</span>
                )}
                {sourceInfo.source === 'no_match' && (
                  <span>No specific source found</span>
                )}
              </div>
            )}
            
            {!isUser && message.id && message.id !== 'loading' && (
              <ChatMessageFeedback 
                messageId={message.id} 
                chatId={message.chatId} 
                sourceInfo={sourceInfo}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
