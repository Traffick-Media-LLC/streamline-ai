
import { useState, useCallback, useEffect } from 'react';
import { State, Product } from '@/types/statePermissions';
import { toast } from "@/components/ui/sonner";

// Define a proper return type for state operations
interface StateOperationResult {
  success: boolean;
  stateId?: number;
}

export const useStateSelection = (stateProducts: any[]) => {
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Effect to track selected products changes is moved to the main hook

  const handleStateClick = useCallback((stateName: string, states: State[], setIsDialogOpen: (open: boolean) => void): StateOperationResult => {
    console.log("State clicked:", stateName);
    const state = states.find(s => s.name === stateName);
    if (state) {
      const allowedProductIds = stateProducts
        .filter(sp => sp.state_id === state.id)
        .map(sp => sp.product_id || 0)
        .filter(id => id !== 0);
      
      console.log("Found state:", state, "with product IDs:", allowedProductIds);
      setSelectedState(state);
      setSelectedProducts(allowedProductIds);
      setHasChanges(false);
      setIsDialogOpen(true); // Open the dialog when a state is selected
      return {
        success: true,
        stateId: state.id
      };
    } else {
      console.error("State not found:", stateName);
      toast.error(`State "${stateName}" not found in database`);
      return {
        success: false
      };
    }
  }, [stateProducts]);

  const handleEditState = useCallback((state: State, setIsDialogOpen: (open: boolean) => void): StateOperationResult => {
    console.log("Editing state:", state);
    const allowedProductIds = stateProducts
      .filter(sp => sp.state_id === state.id)
      .map(sp => sp.product_id || 0)
      .filter(id => id !== 0);
    
    setSelectedState(state);
    setSelectedProducts(allowedProductIds);
    setHasChanges(false);
    setIsDialogOpen(true); // Open the dialog when edit is clicked
    return {
      success: true,
      stateId: state.id
    };
  }, [stateProducts]);

  return {
    selectedState,
    setSelectedState,
    selectedProducts,
    setSelectedProducts,
    hasChanges,
    setHasChanges,
    handleStateClick,
    handleEditState
  };
};
