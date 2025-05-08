
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

  // Helper function to force cache invalidation
  const forceInvalidateCache = useCallback(async () => {
    // Add a random parameter to force the query to bypass cache
    try {
      // Simple query to force a cache refresh
      await supabase.from('state_allowed_products')
        .select('*', { count: 'exact', head: true })
        .filter('created_at', 'gte', new Date(Date.now() - 1000 * 60).toISOString())
        .limit(1);
      
      console.log("Cache invalidation query executed");
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
        
        // Record the state we just saved for re-selection
        const savedStateId = stateId;
        const savedStateName = selectedState.name;
        const savedProductIds = [...selectedProducts];
        
        // First update the toast to show success
        toast.dismiss(saveToastId);
        toast.success("State permissions saved successfully");
        
        // Start a more aggressive refresh sequence with multiple attempts
        console.log("Starting enhanced refresh sequence");
        
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
        
        // Only close dialog after all refresh attempts
        if (refreshSuccess) {
          console.log("Refresh successful, closing dialog");
          
          // Delay closing to ensure UI updates first
          setTimeout(() => {
            setIsDialogOpen(false);
          }, 300);
          
          // Force one more refresh after dialog closes
          setTimeout(() => {
            performRobustRefresh(true);
          }, 800);
          
        } else {
          console.error("Failed to refresh data after multiple attempts");
          toast.error("Warning: UI may not reflect the latest data", {
            description: "The save was successful but refreshing the UI failed. Please try manual refresh.",
            action: {
              label: "Refresh",
              onClick: () => {
                forceInvalidateCache().then(() => performRobustRefresh(true));
              }
            }
          });
          
          // Still close dialog even if refresh fails
          setTimeout(() => {
            setIsDialogOpen(false);
          }, 500);
        }
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
