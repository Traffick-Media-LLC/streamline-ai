import { useState } from 'react';
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

export const useStatePermissionsOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();
  const [debugLogs, setDebugLogs] = useState<Array<{level: string, message: string, data?: any}>>([]);

  // Create a reusable error tracker for this component
  const errorTracker = new ErrorTracker('StatePermissionsOperations');

  const addDebugLog: DebugLogger = (level: string, message: string, data?: any) => {
    console.log(`[${level}] ${message}`, data);
    setDebugLogs(prev => [...prev, { level, message, data }]);
  };

  const saveStatePermissions = async (stateId: number, productIds: number[], retryCount = 0): Promise<boolean> => {
    addDebugLog('info', "Starting saveStatePermissions", { stateId, productIds, isAuthenticated, isAdmin, retryCount });
    
    const validationContext: ValidationContext = { isAuthenticated, isAdmin };
    if (!validatePermissions(stateId, productIds, validationContext, addDebugLog)) {
      return false;
    }

    try {
      setIsSaving(true);
      setIsError(false);
      setLastError(null);

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

      // Insert new permissions
      const insertResult = await insertNewPermissions(stateId, productIds, errorTracker);
      if (!insertResult.success) {
        throw new Error(insertResult.error);
      }

      // Verify the changes
      await verifyPermissionsState(stateId, productIds, errorTracker);

      // Log successful completion
      await errorTracker.logStage('saving_permissions', 'complete');
      toast.dismiss("saving-permissions");
      toast.success('State permissions updated successfully');
      return true;
    } catch (error: any) {
      // Log error
      await errorTracker.logStage('saving_permissions', 'error', { 
        errorMessage: error.message,
        errorCode: error.code,
        errorStatus: error.status
      });
      
      console.error('Error saving state permissions:', error);
      setIsError(true);
      setLastError(error.message);
      
      // Log error with the tracker
      errorTracker.logError(
        `Failed to save state permissions: ${error.message}`
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

      // Handle retry for network-related errors
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

  return {
    saveStatePermissions,
    checkPermissionsExist: (stateId: number) => checkPermissionsExist(stateId, errorTracker),
    isSaving,
    isError,
    lastError,
    debugLogs
  };
};
