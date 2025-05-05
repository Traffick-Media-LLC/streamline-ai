
import { useState, useCallback, useEffect } from 'react';
import { useStatePermissionsData } from './useStatePermissionsData';
import { useProductsData } from './useProductsData';
import { useStatePermissionsOperations } from './useStatePermissionsOperations';
import { State, Product } from '@/types/statePermissions';
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useStatePermissionsManager = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { states, stateProducts, loading: statesLoading, error: statesError, refreshData } = useStatePermissionsData();
  const { products, brands, loading: productsLoading, error: productsError } = useProductsData();
  const { saveStatePermissions, isSaving, debugLogs } = useStatePermissionsOperations();
  
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loading = statesLoading || productsLoading;
  const error = statesError || productsError;

  // Track selected products changes
  useEffect(() => {
    setHasChanges(true);
  }, [selectedProducts]);

  // Effect to check authentication status
  useEffect(() => {
    if (!isAuthenticated && !isAdmin) {
      console.log("Not authenticated or not admin. Auth state:", { isAuthenticated, isAdmin });
    } else {
      console.log("Authenticated and admin access confirmed. Auth state:", { isAuthenticated, isAdmin });
    }
  }, [isAuthenticated, isAdmin]);

  const handleStateClick = useCallback((stateName: string) => {
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
      setIsDialogOpen(true);
    } else {
      console.error("State not found:", stateName);
      toast.error(`State "${stateName}" not found in database`);
    }
  }, [states, stateProducts]);

  const handleSavePermissions = async () => {
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
      
      // Refresh with a small delay to allow the database to update
      setTimeout(() => {
        refreshData(true);
      }, 300);
    } else {
      console.error("Save failed");
    }
  };

  const getStateProducts = useCallback((stateId: number) => {
    const productIds = stateProducts
      .filter(sp => sp.state_id === stateId)
      .map(sp => sp.product_id || 0)
      .filter(id => id !== 0);
    
    return products.filter(product => productIds.includes(product.id));
  }, [stateProducts, products]);

  const handleEditState = useCallback((state: State) => {
    console.log("Editing state:", state);
    const allowedProductIds = stateProducts
      .filter(sp => sp.state_id === state.id)
      .map(sp => sp.product_id || 0)
      .filter(id => id !== 0);
    
    setSelectedState(state);
    setSelectedProducts(allowedProductIds);
    setHasChanges(false);
    setIsDialogOpen(true);
  }, [stateProducts]);

  const forceRefreshData = useCallback(() => {
    console.log("Forcing data refresh");
    return refreshData(true);
  }, [refreshData]);

  return {
    states,
    products,
    brands,
    selectedState,
    selectedProducts,
    setSelectedProducts,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isDialogOpen,
    setIsDialogOpen,
    loading,
    error,
    isSaving,
    handleStateClick,
    handleSavePermissions,
    getStateProducts,
    handleEditState,
    refreshData: forceRefreshData,
    hasChanges,
    debugLogs
  };
};
