
import { useRef, useEffect } from 'react';
import { Message } from '@/types/chat';
import ChatMessage from './ChatMessage';

interface ChatThreadProps {
  messages: Message[];
  isLoading?: boolean;
  chatId?: string;
}

const ChatThread = ({ messages, isLoading, chatId }: ChatThreadProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or when loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Function to handle scrolling with offset for the input area
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.closest('.overflow-y-auto');
      if (container) {
        // Scroll to bottom with offset to account for input area
        container.scrollTo({
          top: container.scrollHeight,
          behavior: isLoading ? 'auto' : 'smooth'
        });
      }
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 pb-[136px]">
      <div className="mt-auto">
        {messages.map((message, index) => (
          <ChatMessage 
            key={message.id || index} 
            message={message}
          />
        ))}
        
        {isLoading && chatId && (
          <ChatMessage 
            message={{
              id: 'loading',
              chatId: chatId,
              content: '',
              role: 'assistant',
              createdAt: new Date().toISOString(),
              isLoading: true
            }} 
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatThread;
