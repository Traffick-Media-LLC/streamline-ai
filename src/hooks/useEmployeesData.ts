
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department: string;
  title: string;
  manager_id: string | null;
}

export const useEmployeesData = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('last_name');

      if (error) {
        toast.error("Failed to fetch employees", {
          description: error.message
        });
        throw error;
      }
      return data as Employee[];
    },
    retry: 1
  });
};
