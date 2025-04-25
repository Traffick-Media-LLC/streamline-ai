
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Employee } from '@/hooks/useEmployeesData';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';

const employeeSchema = z.object({
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  title: z.string().min(2, "Title is required"),
  department: z.string().min(2, "Department is required"),
  manager_id: z.string().nullable()
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  onSuccess: () => void;
  employeeToEdit?: Employee;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onOpenChange,
  employees,
  onSuccess,
  employeeToEdit
}) => {
  const { createEmployee, updateEmployee } = useEmployeeOperations();
  const isEditing = !!employeeToEdit;
  
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employeeToEdit ? {
      first_name: employeeToEdit.first_name,
      last_name: employeeToEdit.last_name,
      email: employeeToEdit.email,
      phone: employeeToEdit.phone || "",
      title: employeeToEdit.title,
      department: employeeToEdit.department,
      manager_id: employeeToEdit.manager_id
    } : {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      title: "",
      department: "",
      manager_id: null
    }
  });
  
  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      if (isEditing && employeeToEdit) {
        await updateEmployee.mutateAsync({
          id: employeeToEdit.id,
          ...data
        });
      } else {
        // Ensure all required fields are present even if empty
        const employeeData = {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone || null,
          title: data.title,
          department: data.department,
          manager_id: data.manager_id
        };
        
        await createEmployee.mutateAsync(employeeData);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save employee:", error);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john.smith@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="Sales" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="manager_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manager</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a manager" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">No Manager</SelectItem>
                      {employees
                        .filter(e => !isEditing || e.id !== employeeToEdit?.id)
                        .map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.first_name} {employee.last_name} ({employee.title})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createEmployee.isPending || updateEmployee.isPending}
              >
                {isEditing ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
