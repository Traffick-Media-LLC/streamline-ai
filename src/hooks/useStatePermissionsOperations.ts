
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export const useStatePermissionsOperations = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const validatePermissions = (stateId: number, productIds: number[]): boolean => {
    if (!stateId || stateId <= 0) {
      toast.error("Invalid state selected");
      return false;
    }

    // Validate product IDs - they should be positive numbers
    if (productIds.some(id => !id || id <= 0)) {
      toast.error("One or more invalid products selected");
      return false;
    }

    return true;
  };

  const saveStatePermissions = async (stateId: number, productIds: number[], retryCount = 0): Promise<boolean> => {
    // Validate inputs before proceeding
    if (!validatePermissions(stateId, productIds)) {
      return false;
    }

    try {
      setIsSaving(true);
      setIsError(false);

      // Show immediate feedback
      toast.loading("Saving state permissions...", { id: "saving-permissions" });

      // Delete existing permissions for this state
      const { error: deleteError } = await supabase
        .from('state_allowed_products')
        .delete()
        .eq('state_id', stateId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        throw new Error(`Failed to update permissions: ${deleteError.message}`);
      }

      if (productIds.length > 0) {
        // Insert new permissions
        const newPermissions = productIds.map(productId => ({
          state_id: stateId,
          product_id: productId
        }));

        // Insert in batches of 50 if needed for large datasets
        const { error: insertError } = await supabase
          .from('state_allowed_products')
          .insert(newPermissions);

        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error(`Failed to save new permissions: ${insertError.message}`);
        }
      }

      // Dismiss the loading toast and show success
      toast.dismiss("saving-permissions");
      toast.success('State permissions updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error saving state permissions:', error);
      setIsError(true);
      setLastError(error.message);
      
      toast.dismiss("saving-permissions");
      toast.error('Failed to update state permissions', {
        description: error.message
      });

      // Implement retry logic for certain types of errors
      if (retryCount < 2 && (
        error.message.includes('network') || 
        error.message.includes('timeout') || 
        error.message.includes('connection')
      )) {
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
      const { count, error } = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact', head: true })
        .eq('state_id', stateId);
      
      if (error) throw error;
      return !!count && count > 0;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false; 
    }
  };

  return {
    saveStatePermissions,
    checkPermissionsExist,
    isSaving,
    isError,
    lastError
  };
};
