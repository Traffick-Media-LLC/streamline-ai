
import React from 'react';
import OrgChartImageUploader from './OrgChartImageUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmployeesData } from '@/hooks/useEmployeesData';
import OrgChartViewer from '@/components/OrgChartViewer';

const AdminOrgChart = () => {
  const { data: employees, isLoading } = useEmployeesData();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="image" className="w-full">
        <TabsList>
          <TabsTrigger value="image">Organization Chart Image</TabsTrigger>
          <TabsTrigger value="view">View Organization Chart</TabsTrigger>
        </TabsList>
        <TabsContent value="image" className="pt-4">
          <OrgChartImageUploader />
        </TabsContent>
        <TabsContent value="view" className="pt-4">
          <div className="border rounded-lg p-4">
            <OrgChartViewer />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOrgChart;
