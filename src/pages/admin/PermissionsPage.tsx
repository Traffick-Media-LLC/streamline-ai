
import React from 'react';
import StatePermissions from '../../components/product-management/StatePermissions';
import { Card, CardContent } from "@/components/ui/card";
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const PermissionsPage: React.FC = () => {
  const handleManualRefresh = () => {
    console.log("Manual page refresh triggered");
    window.location.reload();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">State Permissions</h1>
        <Button 
          variant="outline"
          onClick={handleManualRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Force Refresh
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ErrorBoundary>
            <StatePermissions />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsPage;
