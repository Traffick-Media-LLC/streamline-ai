
import { supabase } from "@/integrations/supabase/client";

export const checkUserRoles = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking user roles:', error);
      return [];
    }

    console.log('User roles:', data);
    return data.map(role => role.role);
  } catch (error) {
    console.error('Unexpected error checking user roles:', error);
    return [];
  }
};
