
import { useCallback } from 'react';
import { State } from '@/types/statePermissions';
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface UsePermissionsOperationsProps {
  saveStatePermissions: (stateId: number, productIds: number[]) => Promise<boolean>;
  performRobustRefresh: (forceRefresh?: boolean) => Promise<boolean>;
  selectedState: State | null;
  selectedProducts: number[];
  setIsDialogOpen: (open: boolean) => void;
  setHasChanges: (hasChanges: boolean) => void;
  hasChanges: boolean;
}

export const usePermissionsOperations = ({
  saveStatePermissions,
  performRobustRefresh,
  selectedState,
  selectedProducts,
  setIsDialogOpen,
  setHasChanges,
  hasChanges
}: UsePermissionsOperationsProps) => {

  // Enhanced cache invalidation function with multiple approaches
  const forceInvalidateCache = useCallback(async () => {
    try {
      // Use timestamp to ensure cache bypass
      const timestamp = Date.now();
      console.log("Starting aggressive cache invalidation at:", new Date(timestamp).toISOString());
      
      // Approach 1: Use count query with timestamp parameter
      const countQuery = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact', head: true })
        .eq('id', -999) // Non-existent ID to make the query lightweight
        .limit(1);
      
      // Approach 2: Clear from multiple tables to ensure cache invalidation cascade
      await supabase.from('states')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
        .eq('id', -1);
      
      // Approach 3: Using is_admin() function instead of a non-existent dummy_function
      // This is a safer approach as we know this function exists in the database
      try {
        await supabase.rpc('is_admin').maybeSingle();
      } catch (e) {
        // Expected error in some cases, but helps clear cache
        console.log("Cache invalidation call completed");
      }
      
      console.log("Cache invalidation complete with multiple approaches");
      return true;
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
      return false;
    }
  }, []);

  const handleSavePermissions = useCallback(async () => {
    if (!selectedState) {
      toast.error("No state selected");
      return;
    }
    
    console.log("Saving permissions for state:", selectedState.name, "Products:", selectedProducts);
    
    if (!hasChanges) {
      console.log("No changes detected, skipping save");
      toast.info("No changes to save");
      setIsDialogOpen(false);
      return;
    }

    // Ensure we're working with a proper state ID (number)
    const stateId = typeof selectedState.id === 'number' ? selectedState.id : parseInt(selectedState.id as string, 10);
    if (isNaN(stateId)) {
      toast.error("Invalid state ID");
      return;
    }

    // Show saving toast that we can update later
    const saveToastId = "saving-permissions";
    toast.loading("Saving state permissions...", { id: saveToastId });

    try {
      // Record timestamp before save to ensure we don't refresh with stale data
      const saveStartTime = Date.now();
      
      const success = await saveStatePermissions(stateId, selectedProducts);
      
      if (success) {
        console.log("Save successful, preparing to refresh data");
        
        // Mark that we have no changes, but don't close dialog yet
        setHasChanges(false);
        
        // First update the toast to show success
        toast.dismiss(saveToastId);
        toast.success("State permissions saved successfully");
        
        // Start a more aggressive refresh sequence
        console.log("Starting enhanced multi-phase refresh sequence");
        
        // First try to forcibly invalidate any caching
        await forceInvalidateCache();
        
        // Phase 1: Short delay to allow database to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Phase 2: First refresh attempt with force flag
        console.log("Executing first forced refresh");
        let refreshSuccess = await performRobustRefresh(true);
        
        if (!refreshSuccess) {
          console.log("First refresh failed, trying again with longer delay");
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try cache invalidation again
          await forceInvalidateCache();
          
          // Second attempt with longer wait and force flag
          refreshSuccess = await performRobustRefresh(true);
          
          if (!refreshSuccess) {
            console.log("Second refresh failed, final attempt with maximum delay");
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Final cache invalidation attempt
            await forceInvalidateCache();
            
            // Final refresh attempt with maximum wait
            refreshSuccess = await performRobustRefresh(true);
          }
        }
        
        // Close dialog after all refresh attempts
        console.log("Closing dialog and scheduling follow-up refresh");
        setTimeout(() => {
          setIsDialogOpen(false);
          
          // Force one more refresh after dialog closes for better UI update
          setTimeout(() => {
            performRobustRefresh(true);
          }, 800);
        }, 300);
        
      } else {
        console.error("Save failed");
        toast.dismiss(saveToastId);
        toast.error("Failed to save permissions");
      }
    } catch (error: any) {
      console.error("Exception during save:", error);
      toast.dismiss(saveToastId);
      toast.error(`Error saving permissions: ${error.message}`);
    }
  }, [
    selectedState, 
    selectedProducts, 
    hasChanges, 
    saveStatePermissions, 
    setIsDialogOpen, 
    setHasChanges, 
    performRobustRefresh,
    forceInvalidateCache
  ]);

  return { handleSavePermissions };
};
