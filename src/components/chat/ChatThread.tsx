
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
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
