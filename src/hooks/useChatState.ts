
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Chat, Message } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { generateChatTitle } from '@/utils/chatUtils';

export interface ChatState {
  threads: Chat[];
  currentThreadId: string | null;
  currentThread: Chat | null;
  isLoading: boolean;
  sendMessage: (content: string) => void;
  createNewThread: () => void;
  selectThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
}

export const useChatState = (): ChatState => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Chat[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Find current thread
  const currentThread = threads.find(t => t.id === currentThreadId) || null;

  // Load threads from localStorage on component mount
  useEffect(() => {
    if (!user) return;
    
    const savedThreads = localStorage.getItem(`chat_threads_${user.id}`);
    if (savedThreads) {
      try {
        const parsedThreads = JSON.parse(savedThreads);
        setThreads(parsedThreads);
        
        // Set most recent thread as current if there is one
        if (parsedThreads.length > 0 && !currentThreadId) {
          setCurrentThreadId(parsedThreads[0].id);
        }
      } catch (e) {
        console.error("Error parsing saved threads:", e);
      }
    }
  }, [user]);

  // Save threads to localStorage whenever they change
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`chat_threads_${user.id}`, JSON.stringify(threads));
  }, [threads, user]);

  // Send a new message
  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    
    // Create a new thread if there isn't one
    let threadId = currentThreadId;
    if (!threadId) {
      threadId = uuidv4();
      const newThread: Chat = {
        id: threadId,
        title: "New Conversation",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user_id: user?.id
      };
      
      setThreads(prev => [newThread, ...prev]);
      setCurrentThreadId(threadId);
    }
    
    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: "user",
      createdAt: new Date().toISOString()
    };
    
    setThreads(prev => {
      return prev.map(thread => {
        if (thread.id === threadId) {
          const updatedMessages = [...thread.messages, userMessage];
          
          // If this is the first message, generate a title
          if (thread.messages.length === 0) {
            // This will be updated when the response comes back
            setTimeout(() => {
              generateChatTitle(content).then(title => {
                setThreads(current => {
                  return current.map(t => {
                    if (t.id === threadId) {
                      return { ...t, title };
                    }
                    return t;
                  });
                });
              });
            }, 500);
          }
          
          return {
            ...thread,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          };
        }
        return thread;
      });
    });
    
    // Simulate assistant response
    setIsLoading(true);
    
    setTimeout(() => {
      const assistantMessage: Message = {
        id: uuidv4(),
        content: generateMockResponse(content),
        role: "assistant",
        createdAt: new Date().toISOString()
      };
      
      setThreads(prev => {
        return prev.map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              messages: [...thread.messages, assistantMessage],
              updatedAt: new Date().toISOString()
            };
          }
          return thread;
        });
      });
      
      setIsLoading(false);
    }, 1500);
  };

  // Create a new empty thread
  const createNewThread = () => {
    const newThreadId = uuidv4();
    const newThread: Chat = {
      id: newThreadId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user_id: user?.id
    };
    
    setThreads(prev => [newThread, ...prev]);
    setCurrentThreadId(newThreadId);
  };

  // Select an existing thread
  const selectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  // Delete a thread
  const deleteThread = (threadId: string) => {
    setThreads(prev => prev.filter(thread => thread.id !== threadId));
    
    // If we're deleting the current thread, select another one or none
    if (threadId === currentThreadId) {
      const remainingThreads = threads.filter(thread => thread.id !== threadId);
      setCurrentThreadId(remainingThreads.length > 0 ? remainingThreads[0].id : null);
    }
  };

  return {
    threads,
    currentThreadId,
    currentThread,
    isLoading,
    sendMessage,
    createNewThread,
    selectThread,
    deleteThread
  };
};

// Helper function to generate mock responses
function generateMockResponse(query: string): string {
  const responses = [
    `Based on our information, ${query.includes('legal') ? 'the legal status varies by state. Some states have explicit restrictions while others allow it under certain conditions.' : 'we have relevant information about this in our database.'}`,
    `According to our product database, ${query.includes('Brand') ? 'this brand offers several products that comply with regulations in most states.' : 'there are several options available that might meet your needs.'}`,
    `I found some information about ${query.includes('CBD') ? 'CBD regulations which vary significantly between states. Federal law allows CBD derived from hemp with less than 0.3% THC.' : 'this topic in our knowledge base.'}`,
    `The state regulations ${query.includes('THC') ? 'for THC products are complex. Some states allow recreational use, others only medical use, and some prohibit it entirely.' : 'related to this vary significantly across the country.'}`
  ];
  
  // Return a semi-random response based on the query
  const index = Math.floor(query.length % responses.length);
  return responses[index];
}
