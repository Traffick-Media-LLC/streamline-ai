
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

export const useStatePermissionsOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  const [debugLogs, setDebugLogs] = useState<Array<{level: string, message: string, data?: any}>>([]);
  const [lastSaveTimestamp, setLastSaveTimestamp] = useState<number | null>(null);

  // Create a reusable error tracker for this component
  const errorTracker = new ErrorTracker('StatePermissionsOperations');

  const addDebugLog: DebugLogger = (level: string, message: string, data?: any) => {
    console.log(`[${level}] ${message}`, data);
    // Use a callback to ensure we're getting the latest state
    setDebugLogs(prev => {
      // Limit log size to prevent memory issues
      const newLogs = [...prev, { level, message, data }];
      if (newLogs.length > 100) {
        return newLogs.slice(newLogs.length - 100);
      }
      return newLogs;
    });
  };

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  const saveStatePermissions = async (stateId: number, productIds: number[], retryCount = 0): Promise<boolean> => {
    // Generate a unique operation ID for logging and tracking
    const operationId = `save-${stateId}-${Date.now()}`;
    
    addDebugLog('info', "Starting saveStatePermissions", { 
      stateId, 
      productIds, 
      isAuthenticated: isAuthenticated || isGuest, 
      isAdmin: isAdmin || isGuest, 
      isGuest,
      retryCount,
      operationId
    });
    
    // Verify authentication and admin status first with more detailed logging
    const validationContext: ValidationContext = { 
      isAuthenticated: isAuthenticated || isGuest, 
      isAdmin: isAdmin || isGuest 
    };
    
    addDebugLog('info', "Validating permissions with context", validationContext);
    
    if (!validatePermissions(stateId, productIds, validationContext, addDebugLog)) {
      return false;
    }

    try {
      setIsSaving(true);
      setIsError(false);
      setLastError(null);

      // Log operation start
      await errorTracker.logStage('saving_permissions', 'start', { 
        stateId, 
        productIds,
        isAuthenticated: isAuthenticated || isGuest,
        isAdmin: isAdmin || isGuest,
        isGuest,
        operationId
      });

      // Verify admin status
      const adminVerification = await verifyAdminStatus(errorTracker);
      if (!adminVerification.success) {
        // If we're in guest mode, proceed anyway
        if (isGuest) {
          addDebugLog('warning', "Admin verification failed but proceeding due to guest mode");
        } else {
          throw new Error(adminVerification.error);
        }
      }

      // Delete existing permissions with proper transaction handling
      const deleteResult = await deleteExistingPermissions(stateId, errorTracker);
      if (!deleteResult.success) {
        throw new Error(deleteResult.error);
      }
      
      // Log deletion results
      addDebugLog('info', "Existing permissions deleted", deleteResult.data);

      // Short delay to ensure deletion is completed before insertion
      await new Promise(resolve => setTimeout(resolve, 300));

      // Insert new permissions
      const insertResult = await insertNewPermissions(stateId, productIds, errorTracker);
      if (!insertResult.success) {
        throw new Error(insertResult.error);
      }
      
      // Log insertion results
      addDebugLog('success', "New permissions inserted", insertResult.data);
      
      // Record the timestamp of the successful save
      const saveTime = Date.now();
      setLastSaveTimestamp(saveTime);
      
      // Another short delay to ensure insertion is completed before verification
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify the changes
      const verifyResult = await verifyPermissionsState(stateId, productIds, errorTracker);
      if (!verifyResult.success) {
        addDebugLog('error', "Verification failed", verifyResult);
        throw new Error(verifyResult.error || "Verification failed");
      }
      
      // Log verification results
      addDebugLog('success', "Permissions verified", { 
        verified: verifyResult.success,
        productCount: productIds.length,
        verifiedIds: verifyResult.data?.verifiedIds?.length,
        expectedProductIds: productIds,
        actualProductIds: verifyResult.data?.verifiedIds
      });

      // Log successful completion
      await errorTracker.logStage('saving_permissions', 'complete', { operationId });
      return true;
    } catch (error: any) {
      // Log error
      await errorTracker.logStage('saving_permissions', 'error', { 
        errorMessage: error.message,
        errorCode: error.code,
        errorStatus: error.status,
        operationId
      });
      
      console.error('Error saving state permissions:', error);
      setIsError(true);
      setLastError(error.message);
      
      // Log error with the tracker
      await errorTracker.logError(`Failed to save state permissions: ${error.message}`);
      
      addDebugLog('error', `Error saving permissions: ${error.message}`, { 
        error,
        stack: error.stack,
        stateId,
        productIds
      });
      
      // Handle retry for network-related errors or verification issues
      if (retryCount < 2 && (
        error.message.includes('network') || 
        error.message.includes('timeout') || 
        error.message.includes('connection') ||
        error.message.includes('Verification failed')
      )) {
        addDebugLog('info', "Retrying save operation", { retryCount: retryCount + 1 });
        
        // Increase delay for each retry
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
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
    debugLogs,
    clearDebugLogs,
    lastSaveTimestamp
  };
};
