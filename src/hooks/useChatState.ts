import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Chat, Message, MessageMetadata } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { generateChatTitle } from '@/utils/chatUtils';
import { toast } from '@/components/ui/sonner';

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

  // Load threads from Supabase on component mount
  useEffect(() => {
    if (!user) return;
    
    const fetchChats = async () => {
      try {
        const { data: chats, error } = await supabase
          .from('chats')
          .select('*')
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        if (chats && chats.length > 0) {
          // For each chat, fetch its messages
          const threadsWithMessages = await Promise.all(
            chats.map(async (chat) => {
              const { data: messages, error: messagesError } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('chat_id', chat.id)
                .order('timestamp', { ascending: true });
                
              if (messagesError) {
                console.error("Error fetching messages:", messagesError);
                return {
                  id: chat.id,
                  title: chat.title,
                  messages: [],
                  createdAt: chat.created_at,
                  updatedAt: chat.updated_at,
                  user_id: chat.user_id
                };
              }
              
              // Transform messages to match our Message type
              const formattedMessages = messages?.map(msg => ({
                id: msg.id,
                chatId: msg.chat_id,
                content: msg.content,
                role: msg.role as "system" | "assistant" | "user",
                createdAt: msg.timestamp,
                metadata: msg.metadata as unknown as MessageMetadata
              })) || [];
              
              return {
                id: chat.id,
                title: chat.title,
                messages: formattedMessages,
                createdAt: chat.created_at,
                updatedAt: chat.updated_at,
                user_id: chat.user_id
              };
            })
          );
          
          setThreads(threadsWithMessages as Chat[]);
          
          // Only auto-select the most recent thread if it has messages
          const mostRecentWithMessages = threadsWithMessages.find(thread => thread.messages.length > 0);
          if (mostRecentWithMessages && !currentThreadId) {
            setCurrentThreadId(mostRecentWithMessages.id);
          }
          
          // Clean up empty conversations older than 5 minutes
          cleanupEmptyConversations(threadsWithMessages as Chat[]);
        }
      } catch (e) {
        console.error("Error fetching chats:", e);
        toast.error("Failed to load chat history");
      }
    };
    
    fetchChats();
  }, [user]);

  // Clean up empty conversations
  const cleanupEmptyConversations = async (allThreads: Chat[]) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const emptyOldThreads = allThreads.filter(thread => 
      thread.messages.length === 0 && 
      thread.title === "New Conversation" &&
      new Date(thread.createdAt) < fiveMinutesAgo
    );

    for (const thread of emptyOldThreads) {
      try {
        await supabase
          .from('chats')
          .delete()
          .eq('id', thread.id);
      } catch (e) {
        console.error("Error cleaning up empty conversation:", e);
      }
    }

    if (emptyOldThreads.length > 0) {
      setThreads(prev => prev.filter(thread => !emptyOldThreads.includes(thread)));
    }
  };

  // Send a new message
  const sendMessage = async (content: string) => {
    if (!content.trim() || !user) return;
    
    // Create a new thread if there isn't one or reuse an empty one
    let threadId = currentThreadId;
    if (!threadId) {
      // Look for an existing empty conversation to reuse
      const emptyThread = threads.find(thread => 
        thread.messages.length === 0 && thread.title === "New Conversation"
      );
      
      if (emptyThread) {
        threadId = emptyThread.id;
        setCurrentThreadId(threadId);
      } else {
        threadId = await createNewChatInDb("New Conversation");
        if (!threadId) return;
        
        const newThread: Chat = {
          id: threadId,
          title: "New Conversation",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user_id: user.id
        };
        
        setThreads(prev => [newThread, ...prev]);
        setCurrentThreadId(threadId);
      }
    }
    
    // Add user message to local state first for immediate feedback
    const userMessageId = uuidv4();
    const userMessage: Message = {
      id: userMessageId,
      chatId: threadId,
      content,
      role: "user",
      createdAt: new Date().toISOString()
    };
    
    // Update local state with the user message
    setThreads(prev => {
      return prev.map(thread => {
        if (thread.id === threadId) {
          const updatedMessages = [...thread.messages, userMessage];
          
          return {
            ...thread,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          };
        }
        return thread;
      });
    });
    
    // Store user message in database
    try {
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          id: userMessageId,
          chat_id: threadId,
          content,
          role: 'user'
        });
        
      if (messageError) throw messageError;
    } catch (e) {
      console.error("Error storing user message:", e);
    }
    
    // If this is the first message, generate a title
    if (currentThread && currentThread.messages.length === 0) {
      generateChatTitle(content).then(title => {
        updateChatTitle(threadId!, title);
      });
    }
    
    // Send to Streamline AI edge function
    setIsLoading(true);
    
    try {
      // Get the conversation history (last few messages) for context
      const conversationHistory = currentThread 
        ? currentThread.messages.slice(-5) // Last 5 messages 
        : [];
        
      // Add the new user message to the history
      const messages = [
        ...conversationHistory,
        userMessage
      ];
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('streamline-ai', {
        body: {
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          chatId: threadId,
          userId: user.id
        }
      });
      
      if (error) throw error;
      
      if (data?.response) {
        // Create assistant message
        const assistantMessageId = uuidv4();
        const assistantMessage: Message = {
          id: assistantMessageId,
          chatId: threadId,
          content: data.response,
          role: "assistant",
          createdAt: new Date().toISOString(),
          metadata: { sourceInfo: data.sourceInfo }
        };
        
        // Update local state with the assistant message
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
      }
    } catch (e) {
      console.error("Error calling Streamline AI:", e);
      toast.error("Failed to get a response. Please try again.");
      
      // Add fallback error message
      const errorMessage: Message = {
        id: uuidv4(),
        chatId: threadId,
        content: "I'm sorry, I encountered an error while processing your request. Please try again or contact support.",
        role: "assistant",
        createdAt: new Date().toISOString()
      };
      
      setThreads(prev => {
        return prev.map(thread => {
          if (thread.id === threadId) {
            return {
              ...thread,
              messages: [...thread.messages, errorMessage],
              updatedAt: new Date().toISOString()
            };
          }
          return thread;
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new chat in the database
  const createNewChatInDb = async (title: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const newChatId = uuidv4();
      const { error } = await supabase
        .from('chats')
        .insert({
          id: newChatId,
          user_id: user.id,
          title
        });
        
      if (error) throw error;
      
      return newChatId;
    } catch (e) {
      console.error("Error creating new chat:", e);
      toast.error("Failed to create new conversation");
      return null;
    }
  };

  // Update chat title in database
  const updateChatTitle = async (chatId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId);
        
      if (error) throw error;
      
      // Update local state
      setThreads(prev => {
        return prev.map(thread => {
          if (thread.id === chatId) {
            return {
              ...thread,
              title
            };
          }
          return thread;
        });
      });
    } catch (e) {
      console.error("Error updating chat title:", e);
    }
  };

  // Create a new empty thread
  const createNewThread = async () => {
    if (!user) return;
    
    const newThreadId = await createNewChatInDb("New Conversation");
    if (!newThreadId) return;
    
    const newThread: Chat = {
      id: newThreadId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user_id: user.id
    };
    
    setThreads(prev => [newThread, ...prev]);
    setCurrentThreadId(newThreadId);
  };

  // Select an existing thread
  const selectThread = (threadId: string) => {
    setCurrentThreadId(threadId);
  };

  // Delete a thread
  const deleteThread = async (threadId: string) => {
    if (!user) return;
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', threadId);
        
      if (error) throw error;
      
      // Update local state
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      
      // If we're deleting the current thread, select another one or none
      if (threadId === currentThreadId) {
        const remainingThreads = threads.filter(thread => thread.id !== threadId);
        setCurrentThreadId(remainingThreads.length > 0 ? remainingThreads[0].id : null);
      }
    } catch (e) {
      console.error("Error deleting thread:", e);
      toast.error("Failed to delete conversation");
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
