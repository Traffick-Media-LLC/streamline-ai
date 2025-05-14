
import React, { useEffect } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { supabase } from '@/integrations/supabase/client';
import OrgChartViewer from '@/components/OrgChartViewer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logError, logEvent, generateRequestId } from '@/utils/logging';
import { useAuth } from '@/contexts/AuthContext';
import { ensureBucketAccess } from '@/utils/storage/ensureBucketAccess';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EmployeeDirectory: React.FC = () => {
  const { data: employees = [], isLoading, error } = useEmployeesData();
  const { user } = useAuth();
  const pageRequestId = generateRequestId();

  // Check if the org_chart bucket exists and create it if it doesn't
  useEffect(() => {
    const initOrgChartStorage = async () => {
      try {
        await logEvent({
          requestId: pageRequestId,
          userId: user?.id,
          eventType: 'init_org_chart_storage',
          component: 'EmployeeDirectory',
          message: 'Initializing org chart storage',
          metadata: {},
          severity: 'info'
        });

        const result = await ensureBucketAccess(user?.id);
        
        if (!result.success) {
          await logError(
            pageRequestId,
            'EmployeeDirectory',
            'Error initializing org chart bucket',
            result.error,
            { message: result.message },
            'warning'
          );
          
          console.error('Failed to initialize org chart bucket:', result.error || result.message);
        }
      } catch (error) {
        await logError(
          pageRequestId,
          'EmployeeDirectory',
          'Exception initializing org chart storage',
          error,
          {},
          'error'
        );
        console.error('Exception initializing org_chart storage:', error);
      }
    };

    initOrgChartStorage();
  }, [user?.id, pageRequestId]);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error loading employee data: {error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Employee Directory</h1>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
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

export default EmployeeDirectory;
