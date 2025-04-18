
import { Message } from "../types/chat";

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const generateChatTitle = async (firstMessage: string): Promise<string> => {
  // In a real app, you might want to use AI to generate a title based on the first message
  // For now, we'll just take the first few words
  const words = firstMessage.split(' ');
  const title = words.slice(0, 3).join(' ');
  return title.length < 20 ? title : title.substring(0, 20) + '...';
};

export const getMessagesByDate = (messages: Message[]) => {
  return messages.reduce<Record<string, Message[]>>((acc, message) => {
    const date = new Date(message.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(message);
    return acc;
  }, {});
};
