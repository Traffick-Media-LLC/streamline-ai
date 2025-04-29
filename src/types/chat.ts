
export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  documentIds?: string[]; // Add reference to documents
  referencedDocuments?: DocumentReference[]; // Documents referenced in assistant responses
  animationDelay?: number; // Added for animation timing
}

export interface DocumentReference {
  id: string;
  name: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  documentContext?: string[]; // Active document context for the chat
}

export interface ChatContextType {
  chats: Chat[];
  currentChatId: string | null;
  isLoadingResponse: boolean;
  mode: "simple" | "complex";
  createNewChat: () => Promise<string | null>;
  selectChat: (chatId: string) => void;
  sendMessage: (content: string, documentIds?: string[]) => Promise<void>;
  getCurrentChat: () => Chat | null;
  setMode: (mode: "simple" | "complex") => void;
  isInitializing: boolean;
  // New document context methods
  setDocumentContext: (docIds: string[]) => void;
  getDocumentContext: () => string[];
}
