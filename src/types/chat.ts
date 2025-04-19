
export type MessageRole = "user" | "assistant" | "system";

export interface Source {
  title: string;
  url: string;
  lastUpdated: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  sources?: Source[]; // Optional sources
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
