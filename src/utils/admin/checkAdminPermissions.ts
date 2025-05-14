
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, logError, generateRequestId } from "@/utils/logging";
import { toast } from "@/components/ui/sonner";

export interface PermissionCheckResult {
  success: boolean;
  error?: string | null;
  data?: unknown;
  isAdmin?: boolean; // Add this property
  details?: any; // Add this property
}

export const checkAdminPermissions = async (userId: string): Promise<PermissionCheckResult> => {
  try {
    // Check if the user has admin role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (roleError) {
      console.error("Error checking admin permissions:", roleError);
      return {
        success: false,
        error: roleError.message,
        isAdmin: false
      };
    }

    const isAdmin = roleData?.role === 'admin';
    
    return {
      success: true,
      isAdmin,
      details: { role: roleData?.role }
    };
  } catch (error: any) {
    console.error("Unexpected error checking admin permissions:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
      isAdmin: false
    };
  }
};
