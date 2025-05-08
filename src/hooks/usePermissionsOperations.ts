
import { useCallback } from 'react';
import { State } from '@/types/statePermissions';
import { toast } from "@/components/ui/sonner";

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

    let saveToastId: string | undefined;
    try {
      saveToastId = toast.loading("Saving permissions...", { id: "saving-permissions-progress" }).id;
      
      // Ensure stateId is treated as a number
      const stateId = typeof selectedState.id === 'number' ? selectedState.id : parseInt(String(selectedState.id), 10);
      
      const success = await saveStatePermissions(stateId, selectedProducts);
      if (success) {
        console.log("Save successful, refreshing data");
        setIsDialogOpen(false);
        setHasChanges(false);
        
        // Record the state we just saved for re-selection
        const savedStateId = stateId;
        const savedProductIds = [...selectedProducts];
        
        // First close the dialog
        setIsDialogOpen(false);
        
        // Show refresh toast
        const refreshToastId = toast.loading("Refreshing data...", { id: "refresh-progress" }).id;
        
        // Refresh with a longer delay and multiple attempts if needed
        setTimeout(async () => {
          const refreshSuccess = await performRobustRefresh(true);
          
          toast.dismiss(refreshToastId);
          
          if (refreshSuccess) {
            console.log("Refresh successful after save");
            toast.success("Permissions updated successfully", { id: "update-complete" });
          } else {
            console.error("Failed to refresh data after save");
            toast.error("Warning: UI may not reflect the latest data", {
              description: "The save was successful but refreshing the data failed. Try refreshing the page.",
              id: "refresh-failed"
            });
          }
        }, 800); // Increased delay for database to finalize transaction
      } else {
        console.error("Save failed");
        toast.error("Failed to save permissions", { id: "save-failed" });
      }
    } catch (error) {
      console.error("Exception during save operation:", error);
      toast.error("An unexpected error occurred", { 
        description: error instanceof Error ? error.message : "Unknown error",
        id: "save-error"
      });
    } finally {
      if (saveToastId) toast.dismiss(saveToastId);
    }
  }, [
    selectedState, 
    selectedProducts, 
    hasChanges, 
    saveStatePermissions, 
    setIsDialogOpen, 
    setHasChanges, 
    performRobustRefresh
  ]);

  return { handleSavePermissions };
};
