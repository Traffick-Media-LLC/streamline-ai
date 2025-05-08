
import { useState, useCallback } from 'react';
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorTracker } from "@/utils/logging";
import { validatePermissions, ValidationContext, DebugLogger } from "@/utils/permissions/validationUtils";
import { 
  verifyAdminStatus, 
  deleteExistingPermissions, 
  insertNewPermissions,
  verifyPermissionsState,
  checkPermissionsExist
} from "@/services/permissionsService";
import { useErrorHandling } from './useErrorHandling';

export const useStatePermissionsOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { isAuthenticated, isAdmin } = useAuth();
  const [debugLogs, setDebugLogs] = useState<Array<{level: string, message: string, data?: any}>>([]);
  
  // Use the new error handling hook
  const { 
    error,
    isError,
    clearError,
    handleError,
    attemptRecovery,
    errorTracker
  } = useErrorHandling('StatePermissionsOperations');

  const addDebugLog: DebugLogger = useCallback((level: string, message: string, data?: any) => {
    console.log(`[${level}] ${message}`, data);
    setDebugLogs(prev => [...prev, { level, message, data }]);
  }, []);

  const saveStatePermissions = useCallback(async (stateId: number, productIds: number[], retryCount = 0): Promise<boolean> => {
    addDebugLog('info', "Starting saveStatePermissions", { stateId, productIds, isAuthenticated, isAdmin, retryCount });
    
    const validationContext: ValidationContext = { isAuthenticated, isAdmin };
    if (!validatePermissions(stateId, productIds, validationContext, addDebugLog)) {
      return false;
    }

    try {
      setIsSaving(true);
      clearError();

      // Log operation start
      await errorTracker.logStage('saving_permissions', 'start', { stateId, productIds });
      toast.loading("Saving state permissions...", { id: "saving-permissions" });

      // Verify admin status
      const adminVerification = await verifyAdminStatus(errorTracker);
      if (!adminVerification.success) {
        throw new Error(adminVerification.error);
      }

      // Delete existing permissions
      const deleteResult = await deleteExistingPermissions(stateId, errorTracker);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error);
      }
      
      // Log deletion results
      addDebugLog('info', "Existing permissions deleted", deleteResult.data);

      // Insert new permissions
      const insertResult = await insertNewPermissions(stateId, productIds, errorTracker);
      if (!insertResult.success) {
        throw new Error(insertResult.error);
      }
      
      // Log insertion results
      addDebugLog('success', "New permissions inserted", insertResult.data);

      // Verify the changes
      const verifyResult = await verifyPermissionsState(stateId, productIds, errorTracker);
      if (!verifyResult.success) {
        throw new Error(verifyResult.error || "Verification failed");
      }
      
      // Log verification results
      addDebugLog('success', "Permissions verified", { 
        verified: verifyResult.success,
        productCount: productIds.length,
        verifiedIds: verifyResult.data?.verifiedIds?.length
      });

      // Log successful completion
      await errorTracker.logStage('saving_permissions', 'complete');
      toast.dismiss("saving-permissions");
      toast.success('State permissions updated successfully');
      return true;
    } catch (error: any) {
      // Enhanced error handling with categorization and recovery
      const { isNetworkError } = await handleError(
        error, 
        'saving state permissions',
        { stateId, productIds, retryCount }
      );
      
      // Handle retry for network-related errors
      if (retryCount < 2 && isNetworkError) {
        addDebugLog('info', "Retrying save operation", { retryCount: retryCount + 1 });
        toast.info("Retrying save operation...");
        return await saveStatePermissions(stateId, productIds, retryCount + 1);
      }
      
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [
    isAuthenticated, 
    isAdmin, 
    addDebugLog, 
    errorTracker, 
    clearError, 
    handleError
  ]);

  // Allow checking permissions with proper error handling
  const checkPermissions = useCallback(async (stateId: number) => {
    try {
      await errorTracker.logStage('check_permissions', 'start', { stateId });
      const result = await checkPermissionsExist(stateId, errorTracker);
      await errorTracker.logStage('check_permissions', 'complete', { result });
      return result;
    } catch (error) {
      await handleError(error, 'checking permissions', { stateId });
      return false;
    }
  }, [errorTracker, handleError]);

  return {
    saveStatePermissions,
    checkPermissionsExist: checkPermissions,
    isSaving,
    isError,
    error,
    clearError,
    attemptRecovery,
    debugLogs
  };
};
