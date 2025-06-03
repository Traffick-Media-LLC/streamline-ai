import React, { useState } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Employee } from '@/hooks/useEmployeesData';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';
import EmployeeFormDialog from '@/components/admin/EmployeeFormDialog';

const AdminEmployeeDirectory = () => {
  const { data: employees = [], isLoading, refetch } = useEmployeesData();
  const { deleteEmployee } = useEmployeeOperations();
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleAddEmployee = () => {
    setEmployeeToEdit(undefined);
    setIsDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setIsDialogOpen(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    try {
      await deleteEmployee.mutateAsync(id);
      refetch();
    } catch (error) {
      console.error("Failed to delete employee:", error);
    }
  };

  const handleDialogSuccess = () => {
    setIsDialogOpen(false);
    refetch();
  };
  
  return (
    <div className="space-y-6 container py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Employee Directory Management</CardTitle>
          <Button onClick={handleAddEmployee} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Add Employee
          </Button>
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
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteEmployee(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
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

      {/* Employee Form Dialog */}
      <EmployeeFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleDialogSuccess}
        employeeToEdit={employeeToEdit}
      />
    </div>
  );
};

export default AdminEmployeeDirectory;
