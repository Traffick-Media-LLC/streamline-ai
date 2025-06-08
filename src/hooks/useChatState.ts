
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Chat, Message, MessageMetadata } from "@/types/chat";
import { useChatModeDetection, ChatMode } from "./useChatModeDetection";
import { toast } from "@/hooks/use-toast";

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

  // Load threads on mount and auto-select most recent
  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user]);

  const loadThreads = async () => {
    if (!user) return;

    try {
      console.log('Loading threads for user:', user.id);
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
            metadata: (msg.metadata && typeof msg.metadata === 'object' && !Array.isArray(msg.metadata)) 
              ? msg.metadata as MessageMetadata 
              : undefined,
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
      
      // Auto-select the most recent thread if no thread is currently selected
      if (!currentThreadId && threadsWithMessages.length > 0) {
        console.log('Auto-selecting most recent thread:', threadsWithMessages[0].id);
        setCurrentThreadId(threadsWithMessages[0].id);
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      toast({
        description: "Failed to load chat history. Please try refreshing the page.",
        variant: "destructive"
      });
    }
  };

  const createNewThread = useCallback(async () => {
    if (!user) {
      toast({
        description: "You must be logged in to create a new chat.",
        variant: "destructive"
      });
      return null;
    }

    try {
      console.log('Creating new thread for user:', user.id);
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
      console.log('Created new thread:', chat.id);
      return chat.id;
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        description: "Failed to create new chat. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [user]);

  const selectThread = useCallback((threadId: string) => {
    console.log('Selecting thread:', threadId);
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
      
      toast({
        description: "Chat deleted successfully."
      });
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast({
        description: "Failed to delete chat. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }, [user, currentThreadId]);

  const sendMessage = useCallback(async (content: string, explicitMode?: ChatMode) => {
    if (!user) {
      toast({
        description: "You must be logged in to send messages.",
        variant: "destructive"
      });
      return;
    }

    if (isLoading) {
      console.log('Message sending already in progress, ignoring');
      return;
    }

    console.log('Starting to send message. Current thread ID:', currentThreadId);
    setIsLoading(true);
    
    try {
      // Auto-create thread if none exists
      let threadId = currentThreadId;
      if (!threadId) {
        console.log('No current thread, creating new one');
        threadId = await createNewThread();
        if (!threadId) {
          throw new Error('Failed to create thread');
        }
      }

      // Use explicit mode if provided, otherwise detect from content
      const mode = explicitMode || detectMode(content);
      console.log('Using mode:', mode, 'for query:', content);

      // Add user message
      const userMessage: Message = {
        id: crypto.randomUUID(),
        chatId: threadId,
        content,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      // Insert user message to database
      const { error: userMessageError } = await supabase.from('chat_messages').insert([{
        id: userMessage.id,
        chat_id: threadId,
        content: userMessage.content,
        role: userMessage.role,
      }]);

      if (userMessageError) throw userMessageError;

      // Update thread state
      setThreads(prev => prev.map(thread => 
        thread.id === threadId 
          ? { ...thread, messages: [...thread.messages, userMessage] }
          : thread
      ));

      // Get all messages for context
      const currentThread = threads.find(t => t.id === threadId);
      const allMessages = currentThread ? [...currentThread.messages, userMessage] : [userMessage];

      // Extract user info for personalization
      const userInfo = {
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        fullName: user.user_metadata?.full_name || '',
        email: user.email || ''
      };

      // Call AI with mode parameter
      console.log('Calling AI function with', { threadId, mode, messageCount: allMessages.length });
      const { data, error } = await supabase.functions.invoke('streamline-ai', {
        body: {
          messages: allMessages,
          chatId: threadId,
          userId: user.id,
          userInfo,
          mode // Pass the mode (either explicit or detected)
        }
      });

      if (error) throw error;

      // Add AI response
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        chatId: threadId,
        content: data.response,
        role: 'assistant',
        createdAt: new Date().toISOString(),
        metadata: {
          sourceInfo: data.sourceInfo
        }
      };

      // Insert AI message to database
      const { error: aiMessageError } = await supabase.from('chat_messages').insert([{
        id: aiMessage.id,
        chat_id: threadId,
        content: aiMessage.content,
        role: aiMessage.role,
        metadata: aiMessage.metadata
      }]);

      if (aiMessageError) throw aiMessageError;

      // Update thread state
      setThreads(prev => prev.map(thread => 
        thread.id === threadId 
          ? { ...thread, messages: [...thread.messages, aiMessage] }
          : thread
      ));

      // Update chat title if it's the first message
      if (allMessages.length === 1) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        const { error: titleError } = await supabase
          .from('chats')
          .update({ title })
          .eq('id', threadId);

        if (!titleError) {
          setThreads(prev => prev.map(thread => 
            thread.id === threadId 
              ? { ...thread, title }
              : thread
          ));
        }
      }

      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, currentThreadId, isLoading, threads, detectMode, createNewThread]);

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
