
import { useState } from 'react';

export const useStateUIControls = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  return {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isDialogOpen,
    setIsDialogOpen,
    showDebug,
    setShowDebug
  };
};
