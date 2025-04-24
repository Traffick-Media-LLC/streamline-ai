
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      return users.map(user => ({
        id: user.id,
        email: user.email,
        role: roles?.find(role => role.user_id === user.id) || { role: 'basic' }
      }));
    }
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'basic' }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id' });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success('User role updated successfully');
    },
    onError: (error) => {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  });

  return {
    users,
    isLoading,
    error,
    updateUserRole
  };
};
