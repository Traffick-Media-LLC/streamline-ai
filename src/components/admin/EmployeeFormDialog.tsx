
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Employee } from '@/hooks/useEmployeesData';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmployeeFormDialogProps {
  employee?: Employee;
  employees?: Employee[];
  onSuccess?: () => void;
}

const EmployeeFormDialog = ({ employee, employees, onSuccess }: EmployeeFormDialogProps) => {
  const [open, setOpen] = React.useState(false);
  const { createEmployee, updateEmployee } = useEmployeeOperations();
  
  // Define defaultValues outside of useForm for resetting purposes
  const defaultValues = {
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    title: employee?.title || '',
    manager_id: employee?.manager_id || ''
  };
  
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues
  });

  // Reset form when employee prop changes or dialog opens
  useEffect(() => {
    if (open) {
      // Set form values when the dialog opens
      reset({
        first_name: employee?.first_name || '',
        last_name: employee?.last_name || '',
        email: employee?.email || '',
        phone: employee?.phone || '',
        department: employee?.department || '',
        title: employee?.title || '',
        manager_id: employee?.manager_id || ''
      });
    }
  }, [employee, open, reset]);

  const onSubmit = async (data: any) => {
    try {
      console.log("Form submission data:", data);
      
      // Convert empty string or "no_manager" to null for manager_id
      const formattedData = {
        ...data,
        manager_id: data.manager_id === '' || data.manager_id === 'no_manager' ? null : data.manager_id
      };
      
      if (employee) {
        console.log("Updating employee:", employee.id, formattedData);
        await updateEmployee.mutateAsync({ id: employee.id, ...formattedData });
      } else {
        console.log("Creating new employee:", formattedData);
        await createEmployee.mutateAsync(formattedData);
      }
      
      setOpen(false);
      reset(defaultValues);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  // Handle manager selection change
  const handleManagerChange = (value: string) => {
    // Convert "no_manager" to empty string which will be converted to null in onSubmit
    setValue('manager_id', value === 'no_manager' ? '' : value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={employee ? "outline" : "default"}>
          {employee ? "Edit" : "Add Employee"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input id="first_name" {...register('first_name', { required: true })} />
              {errors.first_name && <span className="text-red-500 text-sm">Required</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input id="last_name" {...register('last_name', { required: true })} />
              {errors.last_name && <span className="text-red-500 text-sm">Required</span>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email', { required: true })} />
            {errors.email && <span className="text-red-500 text-sm">Required</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register('department', { required: true })} />
            {errors.department && <span className="text-red-500 text-sm">Required</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title', { required: true })} />
            {errors.title && <span className="text-red-500 text-sm">Required</span>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="manager">Manager</Label>
            <Select
              value={employee?.manager_id || 'no_manager'}
              onValueChange={handleManagerChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no_manager">No Manager</SelectItem>
                {employees?.filter(e => e.id !== employee?.id).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {employee ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
