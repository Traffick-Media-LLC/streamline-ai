
import { supabase } from "@/integrations/supabase/client";
import { ErrorTracker } from "@/utils/logging";
import { DebugLogger } from "@/utils/permissions/validationUtils";

interface PermissionsOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

export const verifyAdminStatus = async (addDebugLog: DebugLogger): Promise<PermissionsOperationResult> => {
  try {
    const { data: isAdminResult, error: isAdminError } = await supabase.rpc('has_role', {
      _role: 'admin'
    });
    
    if (isAdminError) {
      return { 
        success: false, 
        error: `Failed to verify admin status: ${isAdminError.message}` 
      };
    }
    
    addDebugLog('info', "Admin check result", { isAdmin: isAdminResult });
    
    if (!isAdminResult) {
      return { 
        success: false, 
        error: 'Admin access required to modify permissions.' 
      };
    }
    
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: `Admin verification error: ${error.message}` 
    };
  }
};

export const deleteExistingPermissions = async (
  stateId: number, 
  addDebugLog: DebugLogger
): Promise<PermissionsOperationResult> => {
  try {
    addDebugLog('info', "Deleting existing permissions", { stateId });
    const { error: deleteError, count } = await supabase
      .from('state_allowed_products')
      .delete()
      .eq('state_id', stateId)
      .select('*', { count: 'exact', head: true });

    if (deleteError) {
      addDebugLog('error', "Delete error occurred", { deleteError });
      return { 
        success: false, 
        error: `Failed to update permissions: ${deleteError.message}` 
      };
    }

    addDebugLog('success', "Successfully deleted existing permissions", { count });
    return { success: true, data: { deletedCount: count } };
  } catch (error: any) {
    return { 
      success: false, 
      error: `Delete operation error: ${error.message}` 
    };
  }
};

export const insertNewPermissions = async (
  stateId: number, 
  productIds: number[],
  addDebugLog: DebugLogger
): Promise<PermissionsOperationResult> => {
  if (productIds.length === 0) {
    addDebugLog('info', "No products to insert, skipping insert step");
    return { success: true, data: { insertedCount: 0 } };
  }

  try {
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
      return { 
        success: false, 
        error: `Failed to save new permissions: ${insertError.message}` 
      };
    }

    addDebugLog('success', "Successfully inserted new permissions", { insertedCount: insertData?.length });
    return { success: true, data: { insertedCount: insertData?.length } };
  } catch (error: any) {
    return { 
      success: false, 
      error: `Insert operation error: ${error.message}` 
    };
  }
};

export const verifyPermissionsState = async (
  stateId: number,
  productIds: number[],
  addDebugLog: DebugLogger
): Promise<PermissionsOperationResult> => {
  try {
    const { data: verifyData, error: verifyError } = await supabase
      .from('state_allowed_products')
      .select('product_id')
      .eq('state_id', stateId);
      
    if (verifyError) {
      addDebugLog('warning', "Verification query failed", { verifyError });
      return { success: false, error: verifyError.message };
    }
    
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
      return { 
        success: false, 
        error: "Database state doesn't match requested state", 
        data: { verifiedIds, requestedIds: productIds } 
      };
    }
    
    return { success: true, data: { verifiedIds } };
  } catch (error: any) {
    return { 
      success: false, 
      error: `Verification error: ${error.message}` 
    };
  }
};

export const checkPermissionsExist = async (
  stateId: number,
  addDebugLog: DebugLogger
): Promise<boolean> => {
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
