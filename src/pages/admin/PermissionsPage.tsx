
import React, { useState } from 'react';
import StatePermissions from '../../components/product-management/StatePermissions';
import { Card, CardContent } from "@/components/ui/card";
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const PermissionsPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleManualRefresh = () => {
    console.log("Manual page refresh triggered");
    
    // Show loading toast
    toast.loading("Refreshing data...", {
      id: "manual-refresh"
    });
    
    // Force a complete component refresh by updating the key
    setRefreshKey(prev => prev + 1);
    
    // Dismiss toast after a delay
    setTimeout(() => {
      toast.success("Page refreshed", { 
        id: "manual-refresh",
        description: "Showing the latest data from the database"
      });
    }, 1000);
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
            <StatePermissions key={refreshKey} />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsPage;
