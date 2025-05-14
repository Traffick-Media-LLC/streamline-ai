import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { logEvent, logError, generateRequestId } from "@/utils/logging";

type AppRole = 'basic' | 'admin';

export const useUserRole = (userId: string | undefined) => {
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Skip if no userId is available
    if (!userId) {
      // Only reset admin status if not logged in
      setIsAdmin(false);
      setUserRole(null);
      setLoading(false);
      return;
    }

    // Generate a request ID for this operation for tracing
    const requestId = generateRequestId();
    
    // Small delay to ensure auth is fully initialized
    const timeoutId = setTimeout(() => {
      const fetchUserRole = async () => {
        try {
          console.log(`[UserRole] Fetching role for user: ${userId} (Attempt: ${retryCount + 1})`);
          
          await logEvent({
            requestId,
            userId,
            eventType: 'user_role_check',
            component: 'useUserRole',
            message: `Fetching user role (Attempt: ${retryCount + 1})`,
            metadata: { userId, retryCount }
          });
          
          // First check if the session is valid before proceeding
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error('[UserRole] Session error:', sessionError);
            throw new Error(`Session error: ${sessionError.message}`);
          }
          
          if (!session) {
            console.warn('[UserRole] No active session found, but userId was provided');
            setUserRole('basic');
            setIsAdmin(false);
            return;
          }
          
          // Call the is_admin RPC function directly
          const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_admin');
          
          if (adminCheckError) {
            console.error('[UserRole] Error checking admin status:', adminCheckError);
            
            await logError(
              requestId,
              'useUserRole',
              'Error checking admin status',
              adminCheckError,
              { userId, retryCount }
            );
            
            // Don't throw here, continue to try the fallback approach
          } else {
            console.log("[UserRole] Is admin check result:", isAdminResult);
            setIsAdmin(!!isAdminResult); // Ensure boolean conversion
          }
          
          // Then fetch the actual role as a fallback
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle();

          if (error) {
            console.error('[UserRole] Error fetching user role:', error);
            
            // Only show toast for persistent errors after multiple retries
            if (retryCount > 1) {
              toast.error("Trouble loading user role. Please refresh or try again later.");
            }
            
            await logError(
              requestId,
              'useUserRole',
              'Error fetching user role from database',
              error,
              { userId, retryCount }
            );
            
            // Set a basic role as fallback but keep the error state
            setUserRole('basic');
            setError(error);
            return;
          }
          
          console.log("[UserRole] User role data:", data);
          
          if (data?.role) {
            const role = data.role as AppRole;
            console.log("[UserRole] Setting user role to:", role);
            setUserRole(role);
            
            // Double-check admin status from role
            if (role === 'admin' && !isAdmin) {
              console.log("[UserRole] Setting admin status from role");
              setIsAdmin(true);
            }
          } else {
            console.log("[UserRole] No role found, setting to basic");
            setUserRole('basic');
          }
          
          // Clear any previous errors on success
          setError(null);
          
          // Log success
          await logEvent({
            requestId,
            userId,
            eventType: 'user_role_success',
            component: 'useUserRole',
            message: `User role fetched successfully: ${data?.role || 'basic'}`,
            metadata: { 
              role: data?.role, 
              isAdmin: isAdmin || (data?.role === 'admin'), 
              fromRpc: !!isAdminResult 
            }
          });
        } catch (error) {
          console.error('[UserRole] Error in fetchUserRole:', error);
          
          await logError(
            requestId,
            'useUserRole',
            'Unexpected error fetching user role',
            error,
            { userId, retryCount },
            'auth'
          );
          
          setUserRole('basic');
          setIsAdmin(false);
          setError(error as Error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserRole();
    }, 300); // Small delay to ensure auth is fully initialized
    
    return () => clearTimeout(timeoutId);
  }, [userId, retryCount]);

  // Provide a retry function that consumers can call if needed
  const retry = () => {
    if (userId) {
      setLoading(true);
      setRetryCount(prev => prev + 1);
    }
  };

  return {
    userRole,
    isAdmin,
    loading,
    error,
    retry
  };
};
