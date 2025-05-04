
export const useChatSelection = (
  user,
  currentChatId,
  setCurrentChatId,
  chats
) => {
  // Select a chat
  const selectChat = async (chatId: string) => {
    // Set the current chat ID
    setCurrentChatId(chatId);
  };

  return { selectChat };
};
