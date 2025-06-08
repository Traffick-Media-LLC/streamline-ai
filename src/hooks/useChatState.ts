
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Chat, Message } from "@/types/chat";
import { useChatModeDetection } from "./useChatModeDetection";

export interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export const useChatState = () => {
  const { user } = useAuth();
  const { detectMode } = useChatModeDetection();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load threads on mount
  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  const loadThreads = async () => {
    if (!user) return;

    try {
      const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const threadsWithMessages = await Promise.all(
        (chats || []).map(async (chat) => {
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('timestamp', { ascending: true });

          if (messagesError) throw messagesError;

          // Transform database messages to Message type
          const transformedMessages: Message[] = (messages || []).map(msg => ({
            id: msg.id,
            chatId: msg.chat_id,
            content: msg.content,
            role: msg.role as "system" | "assistant" | "user",
            createdAt: msg.timestamp || new Date().toISOString(),
            metadata: msg.metadata || undefined,
          }));

          return {
            id: chat.id,
            title: chat.title,
            messages: transformedMessages,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at,
          };
        })
      );

      setThreads(threadsWithMessages);
    } catch (error) {
      console.error('Error loading threads:', error);
    }
  };

  const createNewThread = useCallback(async () => {
    if (!user) return;

    try {
      const { data: chat, error } = await supabase
        .from('chats')
        .insert([{
          title: 'New Chat',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newThread: ChatThread = {
        id: chat.id,
        title: chat.title,
        messages: [],
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
      };

      setThreads(prev => [newThread, ...prev]);
      setCurrentThreadId(chat.id);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  }, [user]);

  const selectThread = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
  }, []);

  const deleteThread = useCallback(async (threadId: string) => {
    if (!user) return;

    try {
      // Delete messages first
      await supabase
        .from('chat_messages')
        .delete()
        .eq('chat_id', threadId);

      // Delete chat
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      
      // If this was the current thread, clear selection
      if (currentThreadId === threadId) {
        setCurrentThreadId(null);
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
      throw error;
    }
  }, [user, currentThreadId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!user || !currentThreadId || isLoading) return;

    setIsLoading(true);
    
    try {
      // Detect the mode for this query
      const mode = detectMode(content);
      console.log('Detected mode:', mode, 'for query:', content);

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        chatId: currentThreadId,
        content,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      // Insert user message to database
      await supabase.from('chat_messages').insert([{
        id: userMessage.id,
        chat_id: currentThreadId,
        content: userMessage.content,
        role: userMessage.role,
      }]);

      // Update thread state
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, messages: [...thread.messages, userMessage] }
          : thread
      ));

      // Get all messages for context
      const currentThread = threads.find(t => t.id === currentThreadId);
      const allMessages = currentThread ? [...currentThread.messages, userMessage] : [userMessage];

      // Extract user info for personalization
      const userInfo = {
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        fullName: user.user_metadata?.full_name || '',
        email: user.email || ''
      };

      // Call AI with mode parameter
      const { data, error } = await supabase.functions.invoke('streamline-ai', {
        body: {
          messages: allMessages,
          chatId: currentThreadId,
          userId: user.id,
          userInfo,
          mode // Pass the detected mode
        }
      });

      if (error) throw error;

      // Add AI response
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        chatId: currentThreadId,
        content: data.response,
        role: 'assistant',
        createdAt: new Date().toISOString(),
        metadata: {
          sourceInfo: data.sourceInfo
        }
      };

      // Insert AI message to database
      await supabase.from('chat_messages').insert([{
        id: aiMessage.id,
        chat_id: currentThreadId,
        content: aiMessage.content,
        role: aiMessage.role,
        metadata: aiMessage.metadata
      }]);

      // Update thread state
      setThreads(prev => prev.map(thread => 
        thread.id === currentThreadId 
          ? { ...thread, messages: [...thread.messages, aiMessage] }
          : thread
      ));

      // Update chat title if it's the first message
      if (allMessages.length === 1) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await supabase
          .from('chats')
          .update({ title })
          .eq('id', currentThreadId);

        setThreads(prev => prev.map(thread => 
          thread.id === currentThreadId 
            ? { ...thread, title }
            : thread
        ));
      }

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentThreadId, isLoading, threads, detectMode]);

  const currentThread = threads.find(t => t.id === currentThreadId);

  return {
    currentThread,
    currentThreadId,
    threads,
    isLoading,
    sendMessage,
    createNewThread,
    selectThread,
    deleteThread
  };
};
