
export interface ChatContextType {
  currentChatId: string | null;
  isLoadingResponse: boolean;
  mode: "simple" | "complex";
  createNewChat: () => Promise<string | null>;
  sendMessage: (content: string) => Promise<void>;
  getCurrentChat: () => any;
  setMode: (mode: "simple" | "complex") => void;
  chats: Array<{
    id: string;
    title: string;
    messages: any[];
    createdAt: number;
    updatedAt: number;
  }>;
  selectChat: (chatId: string) => void;
  isInitializing: boolean;
}
