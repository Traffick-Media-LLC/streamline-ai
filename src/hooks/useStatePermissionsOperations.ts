
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export const useStatePermissionsOperations = () => {
  const [isSaving, setIsSaving] = useState(false);

  const saveStatePermissions = async (stateId: number, productIds: number[]) => {
    try {
      setIsSaving(true);

      // Delete existing permissions for this state
      const { error: deleteError } = await supabase
        .from('state_allowed_products')
        .delete()
        .eq('state_id', stateId);

      if (deleteError) {
        throw new Error(`Failed to update permissions: ${deleteError.message}`);
      }

      if (productIds.length > 0) {
        // Insert new permissions
        const newPermissions = productIds.map(productId => ({
          state_id: stateId,
          product_id: productId
        }));

        const { error: insertError } = await supabase
          .from('state_allowed_products')
          .insert(newPermissions);

        if (insertError) {
          throw new Error(`Failed to save new permissions: ${insertError.message}`);
        }
      }

      toast.success('State permissions updated successfully');
      return true;
    } catch (error: any) {
      console.error('Error saving state permissions:', error);
      toast.error('Failed to update state permissions', {
        description: error.message
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveStatePermissions,
    isSaving
  };
};
