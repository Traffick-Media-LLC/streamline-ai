
import React, { useEffect } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OrgChartViewer from '@/components/OrgChartViewer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { generateRequestId } from '@/utils/logging';
import { useAuth } from '@/contexts/AuthContext';
import { ensureBucketAccess } from '@/utils/storage/ensureBucketAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EmployeeDirectory: React.FC = () => {
  const { data: employees = [], isLoading, error } = useEmployeesData();
  const { user } = useAuth();
  const pageRequestId = generateRequestId();

  // Check if the org_chart bucket exists and create it if it doesn't
  useEffect(() => {
    const initOrgChartStorage = async () => {
      try {
        if (user?.id) {
          const result = await ensureBucketAccess(user.id);
          if (!result.success) {
            console.error('Failed to initialize org chart bucket:', result.error);
          }
        }
      } catch (error) {
        console.error('Exception initializing org_chart storage:', error);
      }
    };

    initOrgChartStorage();
  }, [user?.id]);

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

      {/* Employee Table */}
      <Card className="mb-8">
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

      {/* Organization Chart Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgChartViewer />
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDirectory;
