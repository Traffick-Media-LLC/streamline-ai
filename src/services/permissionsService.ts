
import { supabase } from "@/integrations/supabase/client";
import { ErrorTracker } from "@/utils/logging";
import { DebugLogger } from "@/utils/permissions/validationUtils";

interface PermissionsOperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

export const verifyAdminStatus = async (errorTracker: ErrorTracker): Promise<PermissionsOperationResult> => {
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
    
    await errorTracker.logStage('admin_check', 'info', { isAdmin: isAdminResult });
    
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
  errorTracker: ErrorTracker
): Promise<PermissionsOperationResult> => {
  try {
    await errorTracker.logStage('delete_permissions', 'start', { stateId });
    const { error: deleteError, count } = await supabase
      .from('state_allowed_products')
      .delete()
      .eq('state_id', stateId)
      .select('*', { count: 'exact', head: true });

    if (deleteError) {
      await errorTracker.logError("Delete error occurred", deleteError);
      return { 
        success: false, 
        error: `Failed to update permissions: ${deleteError.message}` 
      };
    }

    await errorTracker.logStage('delete_permissions', 'complete', { count });
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
  errorTracker: ErrorTracker
): Promise<PermissionsOperationResult> => {
  if (productIds.length === 0) {
    await errorTracker.logStage('insert_permissions', 'skip', { reason: 'no_products' });
    return { success: true, data: { insertedCount: 0 } };
  }

  try {
    const newPermissions = productIds.map(productId => ({
      state_id: stateId,
      product_id: productId
    }));

    await errorTracker.logStage('insert_permissions', 'start', { newPermissions });
    const { error: insertError, data: insertData } = await supabase
      .from('state_allowed_products')
      .insert(newPermissions)
      .select();

    if (insertError) {
      await errorTracker.logError("Insert error occurred", insertError);
      return { 
        success: false, 
        error: `Failed to save new permissions: ${insertError.message}` 
      };
    }

    await errorTracker.logStage('insert_permissions', 'complete', { insertedCount: insertData?.length });
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
  errorTracker: ErrorTracker
): Promise<PermissionsOperationResult> => {
  try {
    await errorTracker.logStage('verify_permissions', 'start', { stateId, productIds });
    const { data: verifyData, error: verifyError } = await supabase
      .from('state_allowed_products')
      .select('product_id')
      .eq('state_id', stateId);
      
    if (verifyError) {
      await errorTracker.logError("Verification query failed", verifyError);
      return { success: false, error: verifyError.message };
    }
    
    const verifiedIds = verifyData.map(item => item.product_id);
    const allSaved = productIds.every(id => verifiedIds.includes(id));
    const extraItems = verifiedIds.filter(id => !productIds.includes(id));
    
    await errorTracker.logStage('verify_permissions', 'info', { 
      expectedCount: productIds.length,
      actualCount: verifiedIds.length,
      allSaved,
      extraItems
    });
    
    if (!allSaved || extraItems.length > 0) {
      await errorTracker.logError("Verification failed - database state doesn't match requested state");
      return { 
        success: false, 
        error: "Database state doesn't match requested state", 
        data: { verifiedIds, requestedIds: productIds } 
      };
    }
    
    await errorTracker.logStage('verify_permissions', 'complete', { verifiedIds });
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
  errorTracker: ErrorTracker
): Promise<boolean> => {
  try {
    await errorTracker.logStage('check_permissions', 'start', { stateId });
    const { count, error } = await supabase
      .from('state_allowed_products')
      .select('*', { count: 'exact', head: true })
      .eq('state_id', stateId);
    
    if (error) {
      await errorTracker.logError("Error checking permissions", error);
      throw error;
    }
    
    await errorTracker.logStage('check_permissions', 'complete', { count });
    return !!count && count > 0;
  } catch (error) {
    await errorTracker.logError("Exception checking permissions", error);
    console.error('Error checking permissions:', error);
    return false; 
  }
};
