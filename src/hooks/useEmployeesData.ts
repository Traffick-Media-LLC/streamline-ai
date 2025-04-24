
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
      try {
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

        if (!data || data.length === 0) {
          toast.error("No employee data found");
          return [];
        }

        return data as Employee[];
      } catch (error: any) {
        console.error("Error fetching employees:", error);
        throw error;
      }
    },
    retry: 1
  });
};
