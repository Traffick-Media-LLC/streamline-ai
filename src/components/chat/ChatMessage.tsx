import { Message } from '@/types/chat';
import ChatMessageFeedback from './ChatMessageFeedback';
import { renderTextWithLinks } from '@/utils/textUtils';

interface ChatMessageProps {
  message: Message & { isLoading?: boolean };
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  
  // Get the source info for AI messages, if available
  const sourceInfo = !isUser && message.metadata?.sourceInfo;
  
  return (
    <div className={`mb-6 ${isUser ? 'flex justify-end' : ''}`}>
      {isUser ? (
        // User messages keep the bubble style
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%] md:max-w-[70%] lg:max-w-[60%]">
          {message.isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-current animate-bounce" />
              <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.2s]" />
              <div className="h-2 w-2 rounded-full bg-current animate-bounce [animation-delay:0.4s]" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{renderTextWithLinks(message.content)}</div>
          )}
        </div>
      ) : (
        // AI messages without bubble - clean text layout
        <div className="w-full">
          {message.isLoading ? (
            <div className="flex items-center space-x-2 py-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
            </div>
          ) : (
            <div>
              {/* AI response content as clean text */}
              <div className="text-foreground leading-relaxed whitespace-pre-wrap py-2">
                {renderTextWithLinks(message.content)}
              </div>
              
              {/* Source info - styled more subtly */}
              {sourceInfo && (
                <div className="mt-3 mb-2 text-xs text-muted-foreground/80 border-l-2 border-muted pl-3">
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
              
              {/* Feedback buttons - more subtle positioning */}
              {message.id && message.id !== 'loading' && (
                <ChatMessageFeedback 
                  messageId={message.id} 
                  chatId={message.chatId} 
                  sourceInfo={sourceInfo}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
