
export interface ChatContextType {
  currentChatId: string | null;
  isLoadingResponse: boolean;
  createNewChat: () => Promise<string | null>;
  sendMessage: (content: string, docIds?: string[]) => Promise<void>;
  getCurrentChat: () => Chat | null;
  chats: Chat[];
  selectChat: (chatId: string) => void;
  isInitializing: boolean;
  setDocumentContext: (docIds: string[]) => void;
  getDocumentContext: () => string[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  documentIds?: string[];
  referencedDocuments?: DocumentReference[];
  animationDelay?: number;
}

export interface DocumentReference {
  id: string;
  name: string;
  content?: string;
  processed_at?: string;
}

export interface ChatLog {
  requestId: string;
  userId?: string;
  chatId?: string;
  eventType: string;
  component: string;
  message: string;
  durationMs?: number;
  metadata?: Record<string, any>;
  errorDetails?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  timestamp?: number;
}
