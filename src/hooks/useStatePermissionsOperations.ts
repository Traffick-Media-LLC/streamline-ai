
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { logChatError, generateRequestId, ErrorTracker } from "@/utils/chatLogging";

export const useStatePermissionsOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();
  const [debugLogs, setDebugLogs] = useState<Array<{level: string, message: string, data?: any}>>([]);

  // Create a reusable error tracker for this component
  const errorTracker = new ErrorTracker(
    generateRequestId(),
    'StatePermissionsOperations',
    undefined,
    undefined
  );

  const addDebugLog = (level: string, message: string, data?: any) => {
    console.log(`[${level}] ${message}`, data);
    setDebugLogs(prev => [...prev, { level, message, data }]);
  };

  const validatePermissions = (stateId: number, productIds: number[]): boolean => {
    addDebugLog('info', 'Validating permissions', { stateId, productIds, isAuthenticated, isAdmin });
    
    if (!isAuthenticated) {
      const errorMessage = "Authentication required. Please sign in.";
      addDebugLog('error', errorMessage);
      toast.error(errorMessage);
      return false;
    }

    if (!isAdmin) {
      const errorMessage = "Admin access required to modify permissions.";
      addDebugLog('error', errorMessage, { userIsAdmin: isAdmin });
      toast.error(errorMessage);
      return false;
    }

    if (!stateId || stateId <= 0) {
      const errorMessage = "Invalid state selected";
      addDebugLog('error', errorMessage, { stateId });
      toast.error(errorMessage);
      return false;
    }

    if (productIds.some(id => !id || id <= 0)) {
      const errorMessage = "One or more invalid products selected";
      addDebugLog('error', errorMessage, { invalidProducts: productIds.filter(id => !id || id <= 0) });
      toast.error(errorMessage);
      return false;
    }

    addDebugLog('success', 'Permissions validation successful');
    return true;
  };

  const saveStatePermissions = async (stateId: number, productIds: number[], retryCount = 0): Promise<boolean> => {
    addDebugLog('info', "Starting saveStatePermissions", { stateId, productIds, isAuthenticated, isAdmin, retryCount });
    
    if (!validatePermissions(stateId, productIds)) {
      return false;
    }

    try {
      setIsSaving(true);
      setIsError(false);
      setLastError(null);

      // Fix: Use the correct method signature for logStage
      await errorTracker.logStage('saving_permissions', 'start', { stateId, productIds });
      toast.loading("Saving state permissions...", { id: "saving-permissions" });

      // Check the user's role directly from Supabase
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role');
      
      if (roleError) {
        throw new Error(`Failed to verify admin status: ${roleError.message}`);
      }
      
      addDebugLog('info', "User role check", { roleData });

      // First step: Delete existing permissions
      addDebugLog('info', "Deleting existing permissions", { stateId });
      const { error: deleteError, count } = await supabase
        .from('state_allowed_products')
        .delete()
        .eq('state_id', stateId)
        .select('*', { count: 'exact', head: true });

      if (deleteError) {
        addDebugLog('error', "Delete error occurred", { deleteError });
        throw new Error(`Failed to update permissions: ${deleteError.message}`);
      }

      addDebugLog('success', "Successfully deleted existing permissions", { count });

      // Second step: Insert new permissions if there are any
      if (productIds.length > 0) {
        const newPermissions = productIds.map(productId => ({
          state_id: stateId,
          product_id: productId
        }));

        addDebugLog('info', "Inserting new permissions", { newPermissions });
        const { error: insertError, data: insertData } = await supabase
          .from('state_allowed_products')
          .insert(newPermissions)
          .select();

        if (insertError) {
          addDebugLog('error', "Insert error occurred", { insertError });
          throw new Error(`Failed to save new permissions: ${insertError.message}`);
        }

        addDebugLog('success', "Successfully inserted new permissions", { insertedCount: insertData?.length });
      } else {
        addDebugLog('info', "No products to insert, skipping insert step");
      }

      // Verify the changes
      const { data: verifyData, error: verifyError } = await supabase
        .from('state_allowed_products')
        .select('product_id')
        .eq('state_id', stateId);
        
      if (verifyError) {
        addDebugLog('warning', "Verification query failed", { verifyError });
      } else {
        const verifiedIds = verifyData.map(item => item.product_id);
        const allSaved = productIds.every(id => verifiedIds.includes(id));
        const extraItems = verifiedIds.filter(id => !productIds.includes(id));
        
        addDebugLog('info', "Verification results", { 
          expectedCount: productIds.length,
          actualCount: verifiedIds.length,
          allSaved,
          extraItems
        });
        
        if (!allSaved || extraItems.length > 0) {
          addDebugLog('warning', "Verification failed - database state doesn't match requested state", {
            requestedIds: productIds,
            actualIds: verifiedIds
          });
        }
      }

      await errorTracker.logStage('saving_permissions', 'complete');
      toast.dismiss("saving-permissions");
      toast.success('State permissions updated successfully');
      return true;
    } catch (error: any) {
      await errorTracker.logStage('saving_permissions', 'error', { 
        errorMessage: error.message,
        errorCode: error.code,
        errorStatus: error.status
      });
      
      console.error('Error saving state permissions:', error);
      setIsError(true);
      setLastError(error.message);
      
      // Fix: Use the correct method signature for logError
      await errorTracker.logError(
        "Failed to save state permissions", 
        error
      );
      
      addDebugLog('error', `Error saving permissions: ${error.message}`, { 
        error,
        stack: error.stack,
        stateId,
        productIds
      });
      
      toast.dismiss("saving-permissions");
      toast.error('Failed to update state permissions', {
        description: error.message.includes('policy') 
          ? 'Admin access required. Please ensure you have proper permissions.' 
          : `Error: ${error.message}`
      });

      if (retryCount < 2 && (
        error.message.includes('network') || 
        error.message.includes('timeout') || 
        error.message.includes('connection')
      )) {
        addDebugLog('info', "Retrying save operation", { retryCount: retryCount + 1 });
        toast.info("Retrying save operation...");
        return await saveStatePermissions(stateId, productIds, retryCount + 1);
      }
      
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Helper method to check if current permissions exist
  const checkPermissionsExist = async (stateId: number): Promise<boolean> => {
    try {
      addDebugLog('info', "Checking if permissions exist", { stateId });
      const { count, error } = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact', head: true })
        .eq('state_id', stateId);
      
      if (error) {
        addDebugLog('error', "Error checking permissions", { error });
        throw error;
      }
      
      addDebugLog('info', "Permission check result", { count });
      return !!count && count > 0;
    } catch (error) {
      addDebugLog('error', "Exception checking permissions", { error });
      console.error('Error checking permissions:', error);
      return false; 
    }
  };

  return {
    saveStatePermissions,
    checkPermissionsExist,
    isSaving,
    isError,
    lastError,
    debugLogs
  };
};
