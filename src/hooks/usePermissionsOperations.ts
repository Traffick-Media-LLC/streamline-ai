
import { useCallback } from 'react';
import { State } from '@/types/statePermissions';
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProductQueries } from "@/lib/react-query-client";
import { useQueryClient } from '@tanstack/react-query';

interface UsePermissionsOperationsProps {
  saveStatePermissions: (stateId: number, productIds: number[]) => Promise<boolean>;
  performRobustRefresh: (forceRefresh?: boolean) => Promise<boolean>;
  selectedState: State | null;
  selectedProducts: number[];
  setIsDialogOpen: (open: boolean) => void;
  setHasChanges: (hasChanges: boolean) => void;
  hasChanges: boolean;
  clearCache?: () => Promise<boolean>;
}

export const usePermissionsOperations = ({
  saveStatePermissions,
  performRobustRefresh,
  selectedState,
  selectedProducts,
  setIsDialogOpen,
  setHasChanges,
  hasChanges,
  clearCache
}: UsePermissionsOperationsProps) => {
  const queryClient = useQueryClient();

  // Enhanced cache invalidation function with multiple approaches
  const forceInvalidateCache = useCallback(async () => {
    try {
      // Use timestamp to ensure cache bypass
      const timestamp = Date.now();
      console.log("Starting aggressive cache invalidation at:", new Date(timestamp).toISOString());

      // First use any provided clearCache function
      if (clearCache) {
        await clearCache();
      }
      
      // Then use the global utility function
      await invalidateProductQueries();
      
      // Approach 1: Use count query with timestamp parameter to force a fresh fetch
      const countQuery = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact', head: true })
        .eq('id', -999) // Non-existent ID to make the query lightweight
        .limit(1);
      
      // Approach 2: Clear and reset query cache for the specific keys
      queryClient.resetQueries({ queryKey: ['stateProducts'] });
      queryClient.resetQueries({ queryKey: ['products'] });
      
      console.log("Cache invalidation complete with multiple approaches");
      return true;
    } catch (error) {
      console.warn("Cache invalidation failed:", error);
      return false;
    }
  }, [clearCache, queryClient]);

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
      // First try to forcibly invalidate any caching
      await forceInvalidateCache();
      
      const success = await saveStatePermissions(stateId, selectedProducts);
      
      if (success) {
        console.log("Save successful, preparing to refresh data");
        
        // Mark that we have no changes, but don't close dialog yet
        setHasChanges(false);
        
        // First update the toast to show success
        toast.success("State permissions saved successfully", { id: saveToastId });
        
        // Close dialog before performing the refresh
        setIsDialogOpen(false);
        
        // Short delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Do another cache invalidation
        await forceInvalidateCache();
        
        // Now force refresh all data
        const refreshSuccess = await performRobustRefresh(true);
        
        if (!refreshSuccess) {
          console.log("Refresh after save wasn't successful, trying again...");
          // Wait a bit longer before retrying
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Final attempt
          await forceInvalidateCache();
          await performRobustRefresh(true);
        }
        
      } else {
        console.error("Save failed");
        toast.error("Failed to save permissions", { id: saveToastId });
      }
    } catch (error: any) {
      console.error("Exception during save:", error);
      toast.error(`Error saving permissions: ${error.message}`, { id: saveToastId });
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
