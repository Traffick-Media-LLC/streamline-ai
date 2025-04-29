import { useAuth } from "@/contexts/AuthContext";
import { useChatsState } from "./useChatsState";
import { useChatCreation } from "./useChatCreation";
import { useMessageOperations } from "./useMessageOperations";
import { Message, Chat, DocumentReference } from "../types/chat";
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
    getCurrentChat: originalGetCurrentChat
  } = useChatsState();
  
  // Add chats state
  const [chats, setChats] = useState<Chat[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [documentContext, setDocumentContext] = useState<string[]>([]);

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
              timestamp,
              document_ids
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
            timestamp: new Date(msg.timestamp).getTime(),
            documentIds: msg.document_ids && msg.document_ids.length > 0 ? msg.document_ids : undefined
          })),
          createdAt: new Date(chat.created_at).getTime(),
          updatedAt: new Date(chat.updated_at).getTime()
        }));

        setChats(formattedChats);
        if (formattedChats.length > 0 && !currentChatId) {
          console.log("Setting current chat ID to first chat:", formattedChats[0].id);
          setCurrentChatId(formattedChats[0].id);
          
          // Set document context if the first message has documents
          const firstChat = formattedChats[0];
          const lastUserMessage = [...firstChat.messages].reverse()
            .find(msg => msg.role === 'user' && msg.documentIds?.length);
            
          if (lastUserMessage?.documentIds) {
            setDocumentContext(lastUserMessage.documentIds);
          }
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
    
    // Set document context to the most recent user message with documents
    const selectedChat = chats.find(chat => chat.id === chatId);
    if (selectedChat) {
      const lastUserMessage = [...selectedChat.messages].reverse()
        .find(msg => msg.role === 'user' && msg.documentIds?.length);
        
      if (lastUserMessage?.documentIds) {
        setDocumentContext(lastUserMessage.documentIds);
      } else {
        // Clear document context if no documents in this chat
        setDocumentContext([]);
      }
    }
  };

  const { createNewChat } = useChatCreation(user, isGuest, setChats, setCurrentChatId);
  const { handleMessageUpdate } = useMessageOperations(user, isGuest, setChats);

  // Functions to manage document context
  const handleSetDocumentContext = (docIds: string[]) => {
    setDocumentContext(docIds);
  };
  
  const handleGetDocumentContext = () => {
    return documentContext;
  };

  const sendMessage = async (content: string, docIds?: string[]) => {
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

    // Use provided document IDs or the document context
    const documentIds = docIds || handleGetDocumentContext();

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
      documentIds: documentIds.length > 0 ? documentIds : undefined
    };

    await handleMessageUpdate(chatId, userMessage);

    setIsLoadingResponse(true);

    try {
      const currentChat = getCurrentChat();
      const chatMessages = currentChat ? [...currentChat.messages, userMessage] : [userMessage];

      console.log("Sending message to AI assistant with document context:", documentIds);
      
      // Fetch document content for context if documentIds are provided
      let documentContents = [];
      if (documentIds.length > 0) {
        for (const docId of documentIds) {
          try {
            const { data } = await supabase.functions.invoke('drive-integration', {
              body: { operation: 'get', fileId: docId },
            });
            
            if (data?.content?.content) {
              documentContents.push({
                id: docId,
                name: data.file.name,
                content: data.content.content,
                processed_at: data.content.processed_at
              });
            }
          } catch (error) {
            console.error(`Error fetching document ${docId}:`, error);
          }
        }
      }

      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          content, 
          messages: chatMessages,
          documentIds,
          documentContents
        },
      });

      if (error) throw error;
      console.log("Received response from AI assistant");

      const aiResponse: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        timestamp: Date.now(),
        referencedDocuments: data.referencedDocuments
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
    createNewChat,
    sendMessage,
    getCurrentChat,
    chats,
    selectChat,
    isInitializing,
    setDocumentContext: handleSetDocumentContext,
    getDocumentContext: handleGetDocumentContext
  };
};
