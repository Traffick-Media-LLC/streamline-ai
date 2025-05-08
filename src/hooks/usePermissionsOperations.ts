
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
      const success = await saveStatePermissions(stateId, selectedProducts);
      
      if (success) {
        console.log("Save successful, preparing to refresh data");
        
        // Mark that we have changes but don't close dialog yet
        setHasChanges(false);
        
        // Record the state we just saved for re-selection
        const savedStateId = stateId;
        const savedStateName = selectedState.name;
        const savedProductIds = [...selectedProducts];
        
        // First update the toast to show success
        toast.dismiss(saveToastId);
        toast.success("State permissions saved successfully");
        
        // Start a longer refresh delay to ensure database has settled
        console.log("Starting refresh sequence with delay");
        setTimeout(async () => {
          // Only close dialog after refresh completes
          console.log("Starting data refresh after save");
          
          try {
            // Multiple attempts with increasing delay if needed
            let refreshSuccess = false;
            let attempts = 0;
            
            while (!refreshSuccess && attempts < 3) {
              attempts++;
              const delay = Math.pow(2, attempts - 1) * 500; // 500ms, 1s, 2s
              
              if (attempts > 1) {
                console.log(`Refresh attempt ${attempts} with ${delay}ms delay`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              refreshSuccess = await performRobustRefresh(true);
            }
            
            if (refreshSuccess) {
              console.log("Refresh successful after save");
              setIsDialogOpen(false);
            } else {
              console.error("Failed to refresh data after multiple attempts");
              toast.error("Warning: UI may not reflect the latest data. Please try manual refresh.", {
                description: "The save was successful but refreshing the data failed"
              });
              setIsDialogOpen(false);
            }
          } catch (refreshError) {
            console.error("Exception during refresh:", refreshError);
            toast.error("Error refreshing UI after save");
            setIsDialogOpen(false);
          }
        }, 1000); // Increased delay for database to finalize transaction
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
    performRobustRefresh
  ]);

  return { handleSavePermissions };
};
