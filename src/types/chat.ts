
import { User } from "@supabase/supabase-js";

export type SourceInfo = {
  found: boolean;
  legal?: boolean;
  state?: string;
  brand?: string;
  brandLogo?: string | null;
  products?: Array<{
    name: string;
    brand: string;
    brandLogo?: string | null;
  }>;
  message?: string;
  error?: string;
  ingredient?: string;
  source: 'product_database' | 'brand_database' | 'internet_knowledge' | 'drive_files' | 'no_match' | 'database_error';
};

export type MessageMetadata = {
  model?: string;
  tokensUsed?: number;
  responseTimeMs?: number;
  sourceInfo?: SourceInfo;
  isEdited?: boolean;
  [key: string]: any;
};

export type Message = {
  id: string;
  chatId: string;
  createdAt: string;
  content: string;
  role: "system" | "assistant" | "user";
  metadata?: MessageMetadata;
  isEdited?: boolean;
  // Add timestamp as an optional property for backward compatibility
  timestamp?: number;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  user_id?: string;
  metadata?: Record<string, any>;
};

export type SendMessageResult = { success: boolean; error?: string };

export type ChatContextType = {
  currentChatId: string | null;
  isLoadingResponse: boolean;
  isInitializing: boolean;
  createNewChat: () => Promise<string | null>;
  sendMessage: (content: string) => Promise<any>;
  getCurrentChat: () => Chat | null;
  chats: Chat[];
  selectChat: (chatId: string) => void;
  clearChat: () => void;
  fetchChats: () => Promise<void>;
};

export interface ChatOperationsProps {
  user: User | null;
  currentChatId: string;
  setCurrentChatId: (id: string) => void;
  createChat?: (title: string, userId?: string) => Promise<string>;
  getChat?: (chatId: string) => Promise<Chat | null>;
  updateChat?: (chatId: string, updates: Partial<Chat>) => Promise<boolean>;
  deleteChat?: (chatId: string) => Promise<boolean>;
}
