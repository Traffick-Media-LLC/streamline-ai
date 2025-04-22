
import { useAuth } from "@/contexts/AuthContext";
import { useChatsState } from "./useChatsState";
import { useChatFetch } from "./useChatFetch";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { Message } from "../types/chat";

export const useChatOperations = () => {
  const { user, isGuest } = useAuth();
  const {
    chats,
    setChats,
    currentChatId,
    setCurrentChatId,
    isLoadingResponse,
    setIsLoadingResponse,
    mode,
    setMode,
    getCurrentChat
  } = useChatsState();

  const { fetchChats } = useChatFetch(user, setChats, setCurrentChatId, currentChatId);
  const { createNewChat, updateChatTitle } = useChatCreation(user, isGuest, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, isGuest, setChats);

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId);
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

    await handleMessageUpdate(chatId, userMessage);
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
