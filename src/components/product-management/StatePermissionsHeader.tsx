
import React from 'react';
import { Button } from "@/components/ui/button";
import { List, RefreshCw, Bug, Loader2 } from "lucide-react";

interface StatePermissionsHeaderProps {
  refreshData: () => void;
  loading: boolean;
  showDebug: boolean;
  setShowDebug: (show: boolean) => void;
}

export const StatePermissionsHeader: React.FC<StatePermissionsHeaderProps> = ({
  refreshData,
  loading,
  showDebug,
  setShowDebug
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">Manage State Permissions</h2>
      <div className="flex gap-4">
        <Button 
          variant="default"
          disabled={loading}
        >
          <List className="mr-2 h-4 w-4" />
          List View
        </Button>
        <Button 
          variant="outline"
          onClick={refreshData}
          disabled={loading}
          className="ml-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="ml-2"
          onClick={() => setShowDebug(!showDebug)}
          title="Toggle Debug Panel"
        >
          <Bug className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
