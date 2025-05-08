
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
    // Check both methods for admin verification for redundancy
    const { data: isAdminResult, error: isAdminError } = await supabase.rpc('has_role', {
      _role: 'admin'
    });
    
    if (isAdminError) {
      console.warn("Failed to verify admin status with has_role:", isAdminError);
      
      // Try the is_admin RPC as backup
      const { data: isAdminBackup, error: isAdminBackupError } = await supabase.rpc('is_admin');
      
      if (isAdminBackupError) {
        return { 
          success: false, 
          error: `Failed to verify admin status: ${isAdminError.message}` 
        };
      }
      
      if (!isAdminBackup) {
        return { 
          success: false, 
          error: 'Admin access required to modify permissions.' 
        };
      }
      
      await errorTracker.logStage('admin_check', 'progress', { 
        method: 'is_admin', 
        isAdmin: isAdminBackup 
      });
      return { success: true };
    }
    
    await errorTracker.logStage('admin_check', 'progress', { 
      method: 'has_role', 
      isAdmin: isAdminResult 
    });
    
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
    
    // First verify the state exists
    const { data: stateCheck, error: stateCheckError } = await supabase
      .from('states')
      .select('id')
      .eq('id', stateId)
      .single();
    
    if (stateCheckError || !stateCheck) {
      await errorTracker.logError(`State check error: ${stateCheckError?.message || 'State not found'}`);
      return {
        success: false,
        error: `Invalid state: ${stateCheckError?.message || 'State not found'}`,
      };
    }
    
    // Then perform the deletion with proper error handling
    const { error: deleteError, data } = await supabase
      .from('state_allowed_products')
      .delete()
      .eq('state_id', stateId)
      .select();

    if (deleteError) {
      await errorTracker.logError(`Delete error occurred: ${deleteError.message}`);
      return {
        success: false,
        error: `Failed to update permissions: ${deleteError.message}`,
      };
    }

    await errorTracker.logStage('delete_permissions', 'complete', { 
      deletedCount: data?.length ?? 0,
      stateId
    });

    return { success: true, data: { deletedCount: data?.length ?? 0, stateId } };

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
    await errorTracker.logStage('insert_permissions', 'progress', { reason: 'no_products' });
    return { success: true, data: { insertedCount: 0 } };
  }

  try {
    // Validate product IDs first
    const { data: productCheck, error: productCheckError } = await supabase
      .from('products')
      .select('id')
      .in('id', productIds);
    
    if (productCheckError) {
      await errorTracker.logError(`Product validation error: ${productCheckError.message}`);
      return {
        success: false,
        error: `Failed to validate products: ${productCheckError.message}`,
      };
    }
    
    // Check if all product IDs are valid
    const validProductIds = productCheck.map(p => p.id);
    const invalidProductIds = productIds.filter(id => !validProductIds.includes(id));
    
    if (invalidProductIds.length > 0) {
      await errorTracker.logError(`Invalid product IDs found`, { invalidProductIds });
      // Continue with valid IDs only
      productIds = validProductIds;
    }
    
    const newPermissions = productIds.map(productId => ({
      state_id: stateId,
      product_id: productId
    }));

    await errorTracker.logStage('insert_permissions', 'start', { 
      newPermissions,
      stateId,
      productCount: productIds.length
    });
    
    // Perform insertion in chunks if there are many products
    const chunkSize = 100;
    let insertedCount = 0;
    
    // If small number of products, insert all at once
    if (newPermissions.length <= chunkSize) {
      const { error: insertError, data: insertData } = await supabase
        .from('state_allowed_products')
        .insert(newPermissions)
        .select();

      if (insertError) {
        await errorTracker.logError(`Insert error occurred: ${insertError.message}`);
        return { 
          success: false, 
          error: `Failed to save new permissions: ${insertError.message}` 
        };
      }
      
      insertedCount = insertData?.length || 0;
    } else {
      // Handle large inserts in chunks
      for (let i = 0; i < newPermissions.length; i += chunkSize) {
        const chunk = newPermissions.slice(i, i + chunkSize);
        const { error: chunkError, data: chunkData } = await supabase
          .from('state_allowed_products')
          .insert(chunk)
          .select();
          
        if (chunkError) {
          await errorTracker.logError(`Insert chunk error: ${chunkError.message}`);
          return { 
            success: false, 
            error: `Failed to save permissions chunk: ${chunkError.message}` 
          };
        }
        
        insertedCount += chunkData?.length || 0;
      }
    }

    await errorTracker.logStage('insert_permissions', 'complete', { 
      insertedCount,
      expectedCount: productIds.length
    });
    
    return { 
      success: true, 
      data: { 
        insertedCount,
        stateId,
        productIds
      } 
    };
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
    
    // Small delay to ensure database has settled
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('state_allowed_products')
      .select('product_id')
      .eq('state_id', stateId);
      
    if (verifyError) {
      await errorTracker.logError(`Verification query failed: ${verifyError.message}`);
      return { success: false, error: verifyError.message };
    }
    
    // Convert all IDs to numbers for consistent comparison
    const verifiedIds = verifyData
      .map(item => typeof item.product_id === 'string' ? parseInt(item.product_id, 10) : item.product_id)
      .filter(id => !isNaN(id)) as number[];
    
    const normalizedProductIds = productIds
      .map(id => typeof id === 'string' ? parseInt(id as string, 10) : id)
      .filter(id => !isNaN(id));
    
    // Sort both arrays for easier comparison
    verifiedIds.sort((a, b) => a - b);
    normalizedProductIds.sort((a, b) => a - b);
    
    // If no products were selected, verification is successful if none exist
    if (normalizedProductIds.length === 0) {
      const success = verifiedIds.length === 0;
      await errorTracker.logStage('verify_permissions', 'progress', {
        scenario: 'no_products',
        success,
        foundCount: verifiedIds.length
      });
      
      return { 
        success, 
        data: { verifiedIds }, 
        error: success ? undefined : 'Expected no products but found some'
      };
    }
    
    // Verify that all requested products are present (exact match required)
    let allSaved = true;
    const missingIds: number[] = [];
    
    // Check if all expected IDs are present
    normalizedProductIds.forEach(id => {
      if (!verifiedIds.includes(id)) {
        allSaved = false;
        missingIds.push(id);
      }
    });
    
    // Check for any extra items that shouldn't be there
    const extraItems = verifiedIds.filter(id => !normalizedProductIds.includes(id));
    
    // Log verification details
    await errorTracker.logStage('verify_permissions', 'progress', { 
      expectedCount: normalizedProductIds.length,
      actualCount: verifiedIds.length,
      allSaved,
      extraItems,
      missingIds,
      expectedIds: normalizedProductIds,
      verifiedIds
    });
    
    if (!allSaved || extraItems.length > 0) {
      await errorTracker.logError(
        "Verification failed - database state doesn't match requested state"
      );
      return { 
        success: false, 
        error: "Database state doesn't match requested state", 
        data: { 
          verifiedIds, 
          requestedIds: normalizedProductIds,
          missingIds,
          extraItems
        } 
      };
    }
    
    await errorTracker.logStage('verify_permissions', 'complete', { 
      verifiedIds,
      success: true
    });
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
      await errorTracker.logError(`Error checking permissions: ${error.message}`);
      throw error;
    }
    
    await errorTracker.logStage('check_permissions', 'complete', { count });
    return !!count && count > 0;
  } catch (error: any) {
    await errorTracker.logError(`Exception checking permissions: ${error.message}`);
    console.error('Error checking permissions:', error);
    return false; 
  }
};
