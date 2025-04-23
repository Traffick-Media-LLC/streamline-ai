
export interface ChatContextType {
  currentChatId: string | null;
  isLoadingResponse: boolean;
  mode: "simple" | "complex";
  createNewChat: () => Promise<string | null>;
  sendMessage: (content: string) => Promise<void>;
  getCurrentChat: () => any;
  setMode: (mode: "simple" | "complex") => void;
}
