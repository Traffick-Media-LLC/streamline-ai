
import { supabase } from "@/integrations/supabase/client";
import { logEvent, logError, generateRequestId } from "@/utils/logging";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext"; // Add the missing import

export interface PermissionCheckResult {
  success: boolean;
  isAdmin: boolean;
  error?: any;
  details?: Record<string, any>;
}

export async function checkAdminPermissions(userId: string | undefined): Promise<PermissionCheckResult> {
  const requestId = generateRequestId();
  
  if (!userId) {
    return {
      success: false,
      isAdmin: false,
      details: { reason: 'No user ID provided' }
    };
  }
  
  try {
    await logEvent({
      requestId,
      userId,
      eventType: 'admin_permission_check',
      component: 'checkAdminPermissions',
      message: 'Checking admin permissions',
      metadata: {},
      severity: 'info'
    });
    
    // First verify session is valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      await logError(
        requestId,
        'checkAdminPermissions',
        'Error checking session',
        sessionError,
        { userId },
        'warning'
      );
      
      return {
        success: false,
        isAdmin: false,
        error: sessionError,
        details: { reason: 'Invalid session' }
      };
    }
    
    if (!session) {
      await logEvent({
        requestId,
        userId,
        eventType: 'admin_check_no_session',
        component: 'checkAdminPermissions',
        message: 'No active session found',
        severity: 'warning'
      });
      
      return {
        success: false,
        isAdmin: false,
        details: { reason: 'No active session' }
      };
    }
    
    // Check is_admin function
    const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_admin');
    
    if (adminCheckError) {
      await logError(
        requestId,
        'checkAdminPermissions',
        'Error checking admin status via RPC',
        adminCheckError,
        { userId },
        'warning'
      );
      
      // Fallback to direct query if RPC fails
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (roleError) {
        await logError(
          requestId,
          'checkAdminPermissions',
          'Error checking user role via direct query',
          roleError,
          { userId },
          'error'
        );
        
        return {
          success: false,
          isAdmin: false,
          error: roleError,
          details: { 
            rpcError: adminCheckError,
            roleQueryError: roleError
          }
        };
      }
      
      const isAdminFromQuery = roleData?.role === 'admin';
      
      await logEvent({
        requestId,
        userId,
        eventType: 'admin_check_fallback',
        component: 'checkAdminPermissions',
        message: `Admin check fallback: ${isAdminFromQuery}`,
        metadata: { roleData },
        severity: 'info'
      });
      
      return {
        success: true,
        isAdmin: isAdminFromQuery,
        details: { 
          method: 'direct_query',
          role: roleData?.role
        }
      };
    }
    
    await logEvent({
      requestId,
      userId,
      eventType: 'admin_check_result',
      component: 'checkAdminPermissions',
      message: `Admin check result: ${isAdminResult}`,
      metadata: { isAdminResult },
      severity: 'info'
    });
    
    return {
      success: true,
      isAdmin: !!isAdminResult,
      details: { 
        method: 'rpc',
        rpcResult: isAdminResult
      }
    };
  } catch (error) {
    await logError(
      requestId,
      'checkAdminPermissions',
      'Unexpected error checking admin permissions',
      error,
      { userId },
      'error'
    );
    
    return {
      success: false,
      isAdmin: false,
      error
    };
  }
}

export function useAdminPermissionCheck() {
  const { user } = useAuth();
  
  const checkPermissions = async () => {
    if (!user?.id) return { success: false, isAdmin: false };
    return await checkAdminPermissions(user.id);
  };
  
  return { checkPermissions };
}
