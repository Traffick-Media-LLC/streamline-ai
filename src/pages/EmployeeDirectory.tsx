
import React from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OrgChartViewer from '@/components/OrgChartViewer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const EmployeeDirectory: React.FC = () => {
  const { data: employees = [], isLoading, error } = useEmployeesData();

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

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="employees" className="flex-1">Employees</TabsTrigger>
          <TabsTrigger value="org-chart" className="flex-1">Organization Chart</TabsTrigger>
        </TabsList>
        
        {/* Employees Tab Content */}
        <TabsContent value="employees">
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
        </TabsContent>
        
        {/* Organization Chart Tab Content */}
        <TabsContent value="org-chart">
          <Card>
            <CardHeader>
              <CardTitle>Organization Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <OrgChartViewer />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDirectory;
