
import React from 'react';
import OrgChartImageUploader from '../../components/admin/OrgChartImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StoragePermissionsDiagnostics from '@/components/admin/StoragePermissionsDiagnostics';
import StorageBucketInfo from '@/components/admin/StorageBucketInfo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const OrganizationPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Organization Chart</h1>
      
      <Tabs defaultValue="chart" className="w-full">
        <TabsList>
          <TabsTrigger value="chart">Organization Chart</TabsTrigger>
          <TabsTrigger value="diagnostics">Upload Diagnostics</TabsTrigger>
          <TabsTrigger value="bucket-info">Bucket Information</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Chart Image</CardTitle>
            </CardHeader>
            <CardContent>
              <OrgChartImageUploader />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="diagnostics" className="mt-6">
          <StoragePermissionsDiagnostics />
        </TabsContent>
        
        <TabsContent value="bucket-info" className="mt-6">
          <StorageBucketInfo />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizationPage;
