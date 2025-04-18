
import { createContext, useState, useEffect, useContext } from "react";
import { Chat, Message } from "../types/chat";
import { generateChatTitle } from "../utils/chatUtils";

interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  isLoadingResponse: boolean;
  createNewChat: () => string;
  selectChat: (chatId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  getCurrentChat: () => Chat | null;
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

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("streamlineChats");
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      
      // Set current chat to the most recent one if it exists
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
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

    // Get or create a chat
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat();
    }

    // Create user message
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    // Update chat with user message
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === chatId) {
          const isFirstMessage = chat.messages.length === 0;
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, userMessage],
            updatedAt: Date.now(),
          };
          
          // If this is the first message, update the chat title
          if (isFirstMessage) {
            updateChatTitle(chatId!, content);
          }
          
          return updatedChat;
        }
        return chat;
      })
    );

    // Start AI response
    setIsLoadingResponse(true);

    try {
      // Get chat history for context
      const currentChat = chats.find((chat) => chat.id === chatId);
      const chatHistory = currentChat ? currentChat.messages : [];

      // Dummy response for now - in a real app, this would call OpenAI API
      // We'll simulate a delay for now
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Create AI response message
      const aiResponse: Message = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: "assistant",
        content: `This is a simulated response. In a real implementation, we would make an API call to OpenAI GPT-4 Turbo here with your query about "${content}". This would typically return legal guidance related to regulated industries like nicotine, hemp-derived cannabinoids, and kratom.`,
        timestamp: Date.now(),
      };

      // Update chat with AI response
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
      
      // Add error message to chat
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
    createNewChat,
    selectChat,
    sendMessage,
    getCurrentChat,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
