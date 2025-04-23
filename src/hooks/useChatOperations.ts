
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
    // We'll override this function
    getCurrentChat: originalGetCurrentChat
  } = useChatsState();
  
  // Add chats state
  const [chats, setChats] = useState<Chat[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch chats when user changes
  useEffect(() => {
    console.log("Chat operations - user or guest state changed:", !!user, isGuest);
    if (user || isGuest) {
      fetchChats();
    }
  }, [user, isGuest]);

  // Function to fetch chats
  const fetchChats = async () => {
    console.log("Fetching chats - user authenticated:", !!user, "is guest:", isGuest);
    if (!user && !isGuest) {
      console.log("No user or guest, skipping chat fetch");
      return;
    }
    
    setIsInitializing(true);
    
    try {
      if (isGuest) {
        // For guest users, we use local storage
        console.log("Loading guest chats from local storage");
        const storedChats = localStorage.getItem('guestChats');
        if (storedChats) {
          setChats(JSON.parse(storedChats));
          console.log("Guest chats loaded successfully");
        } else {
          console.log("No stored guest chats found");
          setChats([]);
        }
      } else {
        // For authenticated users, fetch from Supabase
        console.log("Fetching chats for authenticated user:", user.id);
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

        console.log(`Fetched ${data.length} chats from database`);
        
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
          console.log("Setting current chat ID to first chat:", formattedChats[0].id);
          setCurrentChatId(formattedChats[0].id);
        }
      }
    } catch (e) {
      console.error("Error in fetchChats:", e);
    } finally {
      setIsInitializing(false);
    }
  };

  // Create a proper getCurrentChat function that uses the chats state
  const getCurrentChat = () => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  };

  // Function to select a chat
  const selectChat = (chatId: string) => {
    console.log("Selecting chat:", chatId);
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
      console.log("Creating new chat for message");
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

      console.log("Sending message to AI assistant");
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          content, 
          mode,
          messages: chatMessages
        },
      });

      if (error) throw error;
      console.log("Received response from AI assistant");

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
    selectChat,
    isInitializing
  };
};
