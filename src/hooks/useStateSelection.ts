
import { useState, useCallback } from 'react';
import { State, Product } from '@/types/statePermissions';
import { toast } from "@/components/ui/sonner";

export const useStateSelection = (stateProducts: any[]) => {
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Effect to track selected products changes is moved to the main hook

  const handleStateClick = useCallback((stateName: string, states: State[]) => {
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
      return true; // Successfully selected state
    } else {
      console.error("State not found:", stateName);
      toast.error(`State "${stateName}" not found in database`);
      return false; // Failed to select state
    }
  }, [stateProducts]);

  const handleEditState = useCallback((state: State) => {
    console.log("Editing state:", state);
    const allowedProductIds = stateProducts
      .filter(sp => sp.state_id === state.id)
      .map(sp => sp.product_id || 0)
      .filter(id => id !== 0);
    
    setSelectedState(state);
    setSelectedProducts(allowedProductIds);
    setHasChanges(false);
    return true; // Successfully set edit state
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
