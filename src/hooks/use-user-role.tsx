
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

type AppRole = 'basic' | 'admin';

export const useUserRole = (userId: string | undefined, isGuest: boolean) => {
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // When isGuest changes, update admin status and role accordingly
    if (isGuest) {
      console.log("Guest mode enabled - granting admin privileges");
      setIsAdmin(true);
      setUserRole('admin');
      setLoading(false);
    } else if (!userId) {
      // Only reset admin status if not logged in
      console.log("Guest mode disabled - reverting to authenticated status");
      setIsAdmin(false);
      setUserRole(null);
      setLoading(false);
    }
  }, [isGuest, userId]);

  useEffect(() => {
    // Skip if we're in guest mode or no userId is available
    if (!userId || isGuest) return;

    const fetchUserRole = async () => {
      try {
        console.log("Fetching role for user:", userId);
        
        // Call the is_admin RPC function directly
        const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_admin');
        
        if (adminCheckError) {
          console.error('Error checking admin status:', adminCheckError);
        } else {
          console.log("Is admin check result:", isAdminResult);
          setIsAdmin(!!isAdminResult); // Ensure boolean conversion
        }
        
        // Then fetch the actual role
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user role:', error);
          toast.error("Failed to fetch user role");
          setUserRole('basic');
          return;
        }
        
        console.log("User role data:", data);
        
        if (data?.role) {
          const role = data.role as AppRole;
          console.log("Setting user role to:", role);
          setUserRole(role);
          
          // Double-check admin status from role
          if (role === 'admin' && !isAdmin) {
            console.log("Setting admin status from role");
            setIsAdmin(true);
          }
        } else {
          console.log("No role found, setting to basic");
          setUserRole('basic');
        }
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        toast.error("Failed to fetch user role");
        setUserRole('basic');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [userId, isGuest, isAdmin]);

  return {
    userRole,
    isAdmin,
    loading
  };
};
