
import { createContext, useContext, useEffect } from "react";
import { ChatContextType } from "../types/chat";
import { useChatOperations } from "../hooks/useChatOperations";

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const {
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
  } = useChatOperations();

  useEffect(() => {
    fetchChats();
  }, []);

  const systemPrompt = `You are a legal assistant specifically focused on 7-hydroxy mitragynine products sold through non-dispensary retail stores and online retail channels ONLY. When discussing legality, you must:

1. ONLY consider what is legal for non-dispensary retail and online sales channels
2. Strictly focus on current regulations around 7-hydroxy concentration limits
3. Emphasize safety guidelines and legal requirements for product labeling
4. Consider state-by-state variations in regulation
5. Clarify when information is about general market status versus specific retail/online sales rules
6. Always remind users that your advice is for non-dispensary retail and online sales only

Do not provide advice about:
- Dispensary sales channels
- Medical claims or effects
- Usage instructions or dosing
- Other regulated compounds unless directly relevant to 7-hydroxy regulations

If unsure about specific regulations, acknowledge uncertainty and suggest consulting local authorities.`;

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
    systemPrompt,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
