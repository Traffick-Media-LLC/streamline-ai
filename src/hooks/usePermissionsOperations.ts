
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

    const success = await saveStatePermissions(selectedState.id, selectedProducts);
    if (success) {
      console.log("Save successful, refreshing data");
      setIsDialogOpen(false);
      setHasChanges(false);
      
      // Record the state we just saved for re-selection
      const savedStateId = selectedState.id;
      const savedProductIds = [...selectedProducts];
      
      // First close the dialog
      setIsDialogOpen(false);
      
      // Refresh with a longer delay and multiple attempts if needed
      setTimeout(async () => {
        const refreshSuccess = await performRobustRefresh(true);
        
        if (refreshSuccess) {
          console.log("Refresh successful after save");
        } else {
          console.error("Failed to refresh data after save");
          toast.error("Warning: UI may not reflect the latest data", {
            description: "The save was successful but refreshing the data failed"
          });
        }
      }, 800); // Increased delay for database to finalize transaction
    } else {
      console.error("Save failed");
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
