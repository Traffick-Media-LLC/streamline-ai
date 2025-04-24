
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'basic';
  created_at: string | null;
}

interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
}

export const useUserRoles = () => {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      try {
        if (!isAdmin) {
          throw new Error("Only admins can list users");
        }
        
        // First check if we're admin using the security definer function
        const { data: adminCheck, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError || !adminCheck) {
          console.error("Admin check failed:", adminError);
          throw new Error("Admin privileges required");
        }
        
        // Now fetch users
        const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
          console.error("Error fetching users:", authError);
          throw authError;
        }

        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*');

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
          throw rolesError;
        }

        return users.map(user => ({
          id: user.id,
          email: user.email,
          role: roles?.find(role => role.user_id === user.id) || { role: 'basic' }
        }));
      } catch (err: any) {
        console.error("Error in useUserRoles:", err);
        throw new Error(err.message || "Failed to load users");
      }
    },
    enabled: isAdmin
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'basic' }) => {
      console.log("Updating user role:", { userId, role });
      
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

      if (error) {
        console.error("Error updating role:", error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('User role updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role: ' + (error.message || 'Unknown error'));
    }
  });

  return {
    users,
    isLoading,
    error,
    updateUserRole
  };
};
