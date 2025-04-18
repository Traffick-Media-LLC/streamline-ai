import { createContext, useState, useEffect, useContext } from "react";
import { Chat, Message } from "../types/chat";
import { generateChatTitle } from "../utils/chatUtils";
import { supabase } from "@/integrations/supabase/client";

interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  isLoadingResponse: boolean;
  mode: "simple" | "complex";
  createNewChat: () => string;
  selectChat: (chatId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  getCurrentChat: () => Chat | null;
  setMode: (mode: "simple" | "complex") => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [mode, setMode] = useState<"simple" | "complex">("simple");

  useEffect(() => {
    const savedChats = localStorage.getItem("streamlineChats");
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      }
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("streamlineChats", JSON.stringify(chats));
    }
  }, [chats]);

  const createNewChat = () => {
    const newChatId = Date.now().toString();
    const newChat: Chat = {
      id: newChatId,
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChatId);
    return newChatId;
  };

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const getCurrentChat = () => {
    if (!currentChatId) return null;
    return chats.find((chat) => chat.id === currentChatId) || null;
  };

  const updateChatTitle = async (chatId: string, firstMessage: string) => {
    const title = await generateChatTitle(firstMessage);
    
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId ? { ...chat, title } : chat
      )
    );
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const isFirstMessage = chat.messages.length === 0;
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: Date.now(),
          };
          
          if (isFirstMessage) {
            updateChatTitle(chatId!, content);
          }
          
          return updatedChat;
        }
        return chat;
      })
    );

    setIsLoadingResponse(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { content, mode },
      });

      if (error) throw error;

      const aiResponse: Message = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
      };

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, aiResponse],
              updatedAt: Date.now(),
            };
          }
          return chat;
        })
      );
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I'm sorry, there was an error processing your request. Please try again.",
        timestamp: Date.now(),
      };
      
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, errorMessage],
              updatedAt: Date.now(),
            };
          }
          return chat;
        })
      );
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const value = {
    chats,
    currentChatId,
    isLoadingResponse,
    mode,
    createNewChat,
    selectChat,
    sendMessage,
    getCurrentChat,
    setMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
