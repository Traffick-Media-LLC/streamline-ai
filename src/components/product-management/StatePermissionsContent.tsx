
import React from 'react';
import { Loader2 } from "lucide-react";
import { StatePermissionsList } from "./StatePermissionsList";
import { State, Product } from '@/types/statePermissions';

interface StatePermissionsContentProps {
  loading: boolean;
  states: State[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  getStateProducts: (stateId: number) => Product[];
  onEditState: (state: State) => void;
  refreshCounter?: number;
}

export const StatePermissionsContent: React.FC<StatePermissionsContentProps> = ({
  loading,
  states,
  searchQuery,
  onSearchChange,
  getStateProducts,
  onEditState,
  refreshCounter
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center my-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading permission data...</p>
      </div>
    );
  }

  if (states.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center mt-10">
        No states found. Try adjusting your search or check back later.
      </div>
    );
  }

  return (
    <StatePermissionsList
      states={states}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      getStateProducts={getStateProducts}
      onEditState={onEditState}
      refreshTrigger={refreshCounter}
    />
  );
};
