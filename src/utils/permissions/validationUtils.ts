
import { toast } from "@/components/ui/sonner";

export interface ValidationContext {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

export type DebugLogger = (level: string, message: string, data?: any) => void;

export const validatePermissions = (
  stateId: number, 
  productIds: number[], 
  context: ValidationContext,
  addDebugLog: DebugLogger
): boolean => {
  addDebugLog('info', 'Validating permissions', { stateId, productIds, ...context });
  
  if (!context.isAuthenticated) {
    const errorMessage = "Authentication required. Please sign in.";
    addDebugLog('error', errorMessage);
    toast.error(errorMessage);
    return false;
  }

  if (!context.isAdmin) {
    const errorMessage = "Admin access required to modify permissions.";
    addDebugLog('error', errorMessage, { userIsAdmin: context.isAdmin });
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
