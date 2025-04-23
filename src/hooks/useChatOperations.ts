
import { useAuth } from "@/contexts/AuthContext";
import { useChatsState } from "./useChatsState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { Message, Chat } from "../types/chat";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export const useChatOperations = () => {
  const { user, isGuest } = useAuth();
  const {
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    mode,
    setMode,
    getCurrentChat
  } = useChatsState();
  
  // Add chats state
  const [chats, setChats] = useState<Chat[]>([]);

  // Fetch chats when user changes
  useEffect(() => {
    if (user || isGuest) {
      fetchChats();
    }
  }, [user, isGuest]);

  // Function to fetch chats
  const fetchChats = async () => {
    if (!user && !isGuest) return;
    
    if (isGuest) {
      // For guest users, we use local storage
      const storedChats = localStorage.getItem('guestChats');
      if (storedChats) {
        setChats(JSON.parse(storedChats));
      }
      return;
    }
    
    // For authenticated users, fetch from Supabase
    const { data, error } = await supabase
      .from('chats')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        chat_messages (
          id,
          role,
          content,
          timestamp
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load chats");
      return;
    }

    const formattedChats = data.map(chat => ({
      id: chat.id,
      title: chat.title,
      messages: chat.chat_messages.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
        timestamp: new Date(msg.timestamp).getTime()
      })),
      createdAt: new Date(chat.created_at).getTime(),
      updatedAt: new Date(chat.updated_at).getTime()
    }));

    setChats(formattedChats);
    if (formattedChats.length > 0 && !currentChatId) {
      setCurrentChatId(formattedChats[0].id);
    }
  };

  // Function to select a chat
  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const { createNewChat } = useChatCreation(user, isGuest, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, isGuest, setChats);

  const sendMessage = async (content: string) => {
    if (!user && !isGuest) {
      toast.error("Please sign in to send messages");
      return;
    }

    if (!content.trim()) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = await createNewChat();
      if (!chatId) return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    await handleMessageUpdate(chatId, userMessage);

    setIsLoadingResponse(true);

    try {
      const currentChat = getCurrentChat();
      const chatMessages = currentChat ? [...currentChat.messages, userMessage] : [userMessage];

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          content, 
          mode,
          messages: chatMessages
        },
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
      };

      await handleMessageUpdate(chatId, aiResponse);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I'm sorry, there was an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      await handleMessageUpdate(chatId, errorMessage);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  return {
    currentChatId,
    isLoadingResponse,
    mode,
    createNewChat,
    sendMessage,
    getCurrentChat,
    setMode,
    chats,
    selectChat
  };
};
