
import { useState } from 'react';

export const useStateUIControls = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode] = useState<'list'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  return {
    searchQuery,
    setSearchQuery,
    viewMode,
    isDialogOpen,
    setIsDialogOpen,
    showDebug,
    setShowDebug
  };
};
