import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { Employee } from '@/hooks/useEmployeesData';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';
import { toast } from "@/components/ui/sonner";
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
  
  const defaultValues = {
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    department: employee?.department || '',
    title: employee?.title || '',
    manager_id: employee?.manager_id || ''
  };
  
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues
  });

  const selectedManagerId = watch('manager_id');

  useEffect(() => {
    if (open) {
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
      const formattedData = {
        ...data,
        manager_id: data.manager_id === '' || data.manager_id === 'no_manager' 
          ? null 
          : data.manager_id
      };
      
      if (employee) {
        await updateEmployee.mutateAsync({ 
          id: employee.id, 
          ...formattedData
        });
        toast.success("Employee updated successfully");
      } else {
        await createEmployee.mutateAsync(formattedData);
        toast.success("Employee created successfully");
      }
      
      setOpen(false);
      reset(defaultValues);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(`Error: ${error.message || 'Failed to save employee'}`);
    }
  };

  const handleManagerChange = (value: string) => {
    setValue('manager_id', value);
  };

  const getSelectValue = () => {
    if (!selectedManagerId || selectedManagerId === '') return 'no_manager';
    return selectedManagerId;
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
              value={getSelectValue()}
              onValueChange={handleManagerChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a manager">
                  {getSelectValue() === 'no_manager' ? 'No Manager' : 
                    employees?.find(e => e.id === selectedManagerId)
                      ? `${employees.find(e => e.id === selectedManagerId)?.first_name} ${employees.find(e => e.id === selectedManagerId)?.last_name}`
                      : 'Select a manager'}
                </SelectValue>
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
