
import React from 'react';
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
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: employee || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      title: '',
      manager_id: null
    }
  });

  const onSubmit = async (data: any) => {
    try {
      if (employee) {
        await updateEmployee.mutateAsync({ id: employee.id, ...data });
      } else {
        await createEmployee.mutateAsync(data);
      }
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
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
              onValueChange={(value) => {
                register('manager_id').onChange({ target: { value } });
              }}
              defaultValue={employee?.manager_id || undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Manager</SelectItem>
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
