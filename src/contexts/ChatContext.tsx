
import React, { createContext, useContext, useState } from 'react';
import { ChatContextType } from '../types/chat';
import { useChatOperations } from '../hooks/useChatOperations';

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chatOperations = useChatOperations();
  
  return (
    <ChatContext.Provider value={chatOperations}>
      {children}
    </ChatContext.Provider>
  );
};
