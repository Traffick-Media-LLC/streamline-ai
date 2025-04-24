
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
      if (!isAdmin) {
        throw new Error("Only admins can list users");
      }

      // Fetch users
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching users:", authError);
        throw new Error(authError.message);
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        throw new Error(rolesError.message);
      }

      return users.map(user => ({
        id: user.id,
        email: user.email,
        role: roles?.find(role => role.user_id === user.id) || { role: 'basic' }
      }));
    },
    enabled: isAdmin,
    retry: false
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'basic' }) => {
      if (!isAdmin) {
        throw new Error("Only admins can update user roles");
      }

      const { data, error } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: userId, role },
          { onConflict: 'user_id' }
        );

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
      toast.error(error.message || 'Failed to update user role');
    }
  });

  return {
    users,
    isLoading,
    error,
    updateUserRole
  };
};
