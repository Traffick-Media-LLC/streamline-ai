
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

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
  const { setIsGuest } = useAuth();

  const handleContinueAsGuest = () => {
    console.log("Continuing as guest with admin privileges");
    setIsGuest(true);
  };

  // Authentication check
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            This page requires admin access. Please ensure you're logged in with appropriate permissions,
            or continue as a guest to view and edit permissions.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex items-center gap-2">
          <Button 
            onClick={() => window.location.href = '/auth'} 
            className="flex items-center gap-2"
          >
            Go to Login
          </Button>
          <Button 
            onClick={handleContinueAsGuest}
            variant="outline" 
            className="flex items-center gap-2 ml-2"
          >
            <User className="h-4 w-4" /> Continue as Guest
          </Button>
        </div>
      </div>
    );
  }

  // Error check
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

  // If no issues, return null explicitly
  return null;
};
