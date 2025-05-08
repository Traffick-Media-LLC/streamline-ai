
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatePermissionsAuthCheckProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  refreshData: () => void;
}

export const StatePermissionsAuthCheck: React.FC<StatePermissionsAuthCheckProps> = ({
  isAuthenticated,
  isAdmin,
  error,
  refreshData
}) => {
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            This page requires admin access. Please ensure you're logged in with appropriate permissions.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => window.location.href = '/auth'} 
          className="mt-4 flex items-center gap-2"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} className="mt-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return null;
};
