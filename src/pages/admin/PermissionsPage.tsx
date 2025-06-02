
import React, { useState } from 'react';
import StatePermissions from '@/components/product-management/StatePermissions';
import StateNotesManagement from '@/components/product-management/StateNotesManagement';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCheck, Loader2 } from "lucide-react";

const PermissionsPage: React.FC = () => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isNotesDataLoaded, setIsNotesDataLoaded] = useState(false);

  const handleDataLoaded = () => {
    console.log("State permissions data loaded");
    setIsDataLoaded(true);
  };

  const handleNotesDataLoaded = () => {
    console.log("State notes data loaded");
    setIsNotesDataLoaded(true);
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-bold">State Management</h1>
        {(isDataLoaded || isNotesDataLoaded) ? (
          <CircleCheck className="ml-2 h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="ml-2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      <Tabs defaultValue="state-products">
        <TabsList className="mb-4">
          <TabsTrigger value="state-products">Product Permissions</TabsTrigger>
          <TabsTrigger value="state-notes">State Notes</TabsTrigger>
          <TabsTrigger value="documentation" disabled>
            Documentation
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="state-products">
          <Card>
            <CardContent className="pt-6">
              <StatePermissions onDataLoaded={handleDataLoaded} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="state-notes">
          <Card>
            <CardContent className="pt-6">
              <StateNotesManagement onDataLoaded={handleNotesDataLoaded} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionsPage;
