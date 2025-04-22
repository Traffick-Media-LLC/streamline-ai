
import { useState } from "react";
import { Chat, Message } from "../types/chat";
import { supabase } from "@/integrations/supabase/client";
import { generateChatTitle } from "../utils/chatUtils";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useChatOperations = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [mode, setMode] = useState<"simple" | "complex">("simple");
  const { user, isGuest } = useAuth();

  const fetchChats = async () => {
    if (!user) return;

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

  const createNewChat = async () => {
    if (!user && !isGuest) {
      toast.error("Please sign in to create a chat");
      return null;
    }

    if (isGuest) {
      const newChat: Chat = {
        id: `guest-${Date.now()}`,
        title: "New Chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);
      return newChat.id;
    }

    const { data: chat, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: "New Chat"
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      toast.error("Failed to create chat");
      return null;
    }

    const newChat: Chat = {
      id: chat.id,
      title: chat.title,
      messages: [],
      createdAt: new Date(chat.created_at).getTime(),
      updatedAt: new Date(chat.updated_at).getTime(),
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  };

  const updateChatTitle = async (chatId: string, firstMessage: string) => {
    const title = await generateChatTitle(firstMessage);
    
    if (!isGuest && user) {
      const { error } = await supabase
        .from('chats')
        .update({ title })
        .eq('id', chatId);

      if (error) {
        console.error("Error updating chat title:", error);
        return;
      }
    }

    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, title } : chat
      )
    );
  };

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

    const handleMessageUpdate = async (message: Message) => {
      if (!isGuest && user) {
        const { error } = await supabase
          .from('chat_messages')
          .insert({
            chat_id: chatId,
            role: message.role,
            content: message.content
          });

        if (error) {
          console.error("Error saving message:", error);
          toast.error("Failed to save message");
          return;
        }
      }

      setChats(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, message],
              updatedAt: Date.now(),
            };
          }
          return chat;
        })
      );
    };

    await handleMessageUpdate(userMessage);
    const currentChat = chats.find(chat => chat.id === chatId);
    if (currentChat?.messages.length === 0) {
      updateChatTitle(chatId, content);
    }

    setIsLoadingResponse(true);

    try {
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

      await handleMessageUpdate(aiResponse);
    } catch (error) {
      console.error("Error getting AI response:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I'm sorry, there was an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      await handleMessageUpdate(errorMessage);
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const getCurrentChat = () => {
    if (!currentChatId) return null;
    return chats.find((chat) => chat.id === currentChatId) || null;
  };

  return {
    chats,
    currentChatId,
    isLoadingResponse,
    mode,
    fetchChats,
    createNewChat,
    selectChat,
    sendMessage,
    getCurrentChat,
    setMode,
  };
};
