
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Employee } from "./useEmployeesData";
import { useAuth } from "@/contexts/AuthContext";

export const useEmployeeOperations = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const createEmployee = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
      if (!isAdmin) {
        throw new Error("Admin privileges required");
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([employee])
        .select()
        .single();

      if (error) {
        console.error("Error creating employee:", error);
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating employee:', error);
      toast.error(error.message || 'Failed to add employee');
    }
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Employee> & { id: string }) => {
      if (!isAdmin) {
        throw new Error("Admin privileges required");
      }

      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error("Error updating employee:", error);
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error updating employee:', error);
      toast.error(error.message || 'Failed to update employee');
    }
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) {
        throw new Error("Admin privileges required");
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Error deleting employee:", error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting employee:', error);
      toast.error(error.message || 'Failed to delete employee');
    }
  });

  return {
    createEmployee,
    updateEmployee,
    deleteEmployee
  };
};
