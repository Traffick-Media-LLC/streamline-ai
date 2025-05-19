import React, { useEffect, useState } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OrgChartViewer from '@/components/OrgChartViewer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { generateRequestId } from '@/utils/logging';
import { useAuth } from '@/contexts/AuthContext';
import { ensureBucketAccess, BUCKET_ID } from '@/utils/storage/ensureBucketAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import OrgChartDebugTools from '@/components/OrgChartDebugTools';
import { Button } from '@/components/ui/button';

const EmployeeDirectory: React.FC = () => {
  const { data: employees = [], isLoading, error } = useEmployeesData();
  const { user } = useAuth();
  const { imageSettings } = useOrgChartImage();
  const pageRequestId = generateRequestId();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [showDebugTools, setShowDebugTools] = useState(false);

  // Force a refresh of the image settings by directly querying the database
  useEffect(() => {
    const checkAppSettings = async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .eq('id', 'org_chart_image')
            .single();
          
          if (error) {
            console.error('Error fetching app_settings:', error);
          } else {
            console.log('Direct app_settings query result:', data);
            setDebugInfo(data);
          }
        }
      } catch (error) {
        console.error('Exception querying app_settings:', error);
      }
    };
    
    checkAppSettings();
  }, [user?.id]);

  // Check if the storage bucket exists and create it if it doesn't
  useEffect(() => {
    const initOrgChartStorage = async () => {
      try {
        if (user?.id) {
          console.log(`Initializing ${BUCKET_ID} bucket access for user ${user.id}`);
          const result = await ensureBucketAccess(user.id);
          if (!result.success) {
            console.error('Failed to initialize bucket:', result.error);
            toast.error("Failed to access organization chart");
          } else {
            console.log(`Successfully verified access to ${BUCKET_ID} bucket`);
          }
        }
      } catch (error) {
        console.error(`Exception initializing ${BUCKET_ID} storage:`, error);
        toast.error("Error accessing organization chart storage");
      }
    };

    initOrgChartStorage();
  }, [user?.id]);

  useEffect(() => {
    // Log when org chart image is loaded
    if (imageSettings?.url) {
      console.log("Org chart image loaded:", imageSettings.url);
    } else {
      console.log("No org chart image URL available");
    }
  }, [imageSettings]);

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

      {/* Organization Chart */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Organization Chart</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowDebugTools(!showDebugTools)}
          >
            {showDebugTools ? 'Hide Debug Tools' : 'Show Debug Tools'}
          </Button>
        </CardHeader>
        <CardContent>
          <OrgChartViewer />
          
          {/* Debug info - will be removed in production */}
          {(!imageSettings?.url || debugInfo) && showDebugTools && (
            <div className="mt-4 p-4 bg-muted rounded-md text-xs">
              <p className="font-semibold">Debug Information:</p>
              <p>Image URL: {imageSettings?.url || 'Not set'}</p>
              <p>Image Type: {imageSettings?.fileType || 'Not set'}</p>
              <p>Updated: {imageSettings?.updated_at || 'Not set'}</p>
              {debugInfo && (
                <pre className="mt-2 overflow-auto max-h-[150px]">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              )}
            </div>
          )}
          
          {showDebugTools && <OrgChartDebugTools />}
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees && employees.length > 0 ? (
                    employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.first_name} {employee.last_name}</TableCell>
                        <TableCell>{employee.title}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>{employee.phone || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No employees found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDirectory;
