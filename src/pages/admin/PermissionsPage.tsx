
import React, { useState } from 'react';
import StatePermissions from '@/components/product-management/StatePermissions';
import StateNotesManagement from '@/components/product-management/StateNotesManagement';
import StateExciseTaxesManagement from '@/components/product-management/StateExciseTaxesManagement';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCheck, Loader2 } from "lucide-react";

const PermissionsPage: React.FC = () => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isNotesDataLoaded, setIsNotesDataLoaded] = useState(false);
  const [isExciseTaxesDataLoaded, setIsExciseTaxesDataLoaded] = useState(false);

  const handleDataLoaded = () => {
    console.log("State permissions data loaded");
    setIsDataLoaded(true);
  };

  const handleNotesDataLoaded = () => {
    console.log("State notes data loaded");
    setIsNotesDataLoaded(true);
  };

  const handleExciseTaxesDataLoaded = () => {
    console.log("State excise taxes data loaded");
    setIsExciseTaxesDataLoaded(true);
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-bold">State Management</h1>
        {(isDataLoaded || isNotesDataLoaded || isExciseTaxesDataLoaded) ? (
          <CircleCheck className="ml-2 h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="ml-2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      <Tabs defaultValue="state-products">
        <TabsList className="mb-4">
          <TabsTrigger value="state-products">Product Permissions</TabsTrigger>
          <TabsTrigger value="state-notes">State Notes</TabsTrigger>
          <TabsTrigger value="excise-taxes">Excise Taxes</TabsTrigger>
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

        <TabsContent value="excise-taxes">
          <Card>
            <CardContent className="pt-6">
              <StateExciseTaxesManagement onDataLoaded={handleExciseTaxesDataLoaded} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionsPage;
