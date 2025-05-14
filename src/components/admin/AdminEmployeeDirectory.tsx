
import React from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrgChartViewer from '@/components/OrgChartViewer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgChartImage } from '@/hooks/useOrgChartImage';

const AdminEmployeeDirectory = () => {
  const { data: employees, isLoading } = useEmployeesData();
  const { imageSettings } = useOrgChartImage();
  
  return (
    <div className="space-y-6 container py-6">
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList>
              <TabsTrigger value="list">Employee List</TabsTrigger>
              <TabsTrigger value="chart">Organization Chart</TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="pt-4">
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {employees && employees.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {employees.map((employee) => (
                        <Card key={employee.id}>
                          <CardContent className="p-4">
                            <div className="font-medium">{employee.first_name} {employee.last_name}</div>
                            <div className="text-sm text-muted-foreground">{employee.title}</div>
                            <div className="text-sm text-muted-foreground">{employee.department}</div>
                            <div className="text-sm">{employee.email}</div>
                            {employee.phone && <div className="text-sm">{employee.phone}</div>}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      No employees found
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="chart" className="pt-4">
              <OrgChartViewer employees={employees} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmployeeDirectory;
