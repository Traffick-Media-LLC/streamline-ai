import { useState, useCallback, useEffect } from 'react';
import { useStatePermissionsData } from './useStatePermissionsData';
import { useProductsData } from './useProductsData';
import { useStatePermissionsOperations } from './useStatePermissionsOperations';
import { useStateSelection } from './useStateSelection';
import { useStateUIControls } from './useStateUIControls';
import { useStatePermissionsSync } from './useStatePermissionsSync';
import { useProductUtils } from './useProductUtils';
import { usePermissionsOperations } from './usePermissionsOperations';
import { State } from '@/types/statePermissions';
import { useAuth } from "@/contexts/AuthContext";

interface StateOperationResult {
  success: boolean;
  stateId?: number;
}

export const useStatePermissionsManager = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
  const { 
    states, 
    stateProducts, 
    loading: statesLoading, 
    error: statesError, 
    refreshData: refreshStateData,
    refreshCounter,
    hasInitialized,
    fetchProductsForState
  } = useStatePermissionsData();
  
  const { 
    products, 
    brands, 
    loading: productsLoading, 
    error: productsError 
  } = useProductsData();
  
  const { 
    saveStatePermissions, 
    isSaving, 
    debugLogs,
    lastSaveTimestamp 
  } = useStatePermissionsOperations();

  const { 
    searchQuery, 
    setSearchQuery, 
    viewMode,
    isDialogOpen, 
    setIsDialogOpen 
  } = useStateUIControls();

  const { 
    selectedState, 
    setSelectedState, 
    selectedProducts, 
    setSelectedProducts, 
    hasChanges, 
    setHasChanges, 
    handleStateClick: baseHandleStateClick, 
    handleEditState: baseHandleEditState 
  } = useStateSelection(stateProducts);

  const { 
    isRefreshing, 
    performRobustRefresh,
    clearCache
  } = useStatePermissionsSync(refreshStateData);

  const { getStateProducts } = useProductUtils(stateProducts, products);

  const loading = statesLoading || productsLoading || isRefreshing;
  const error = statesError || productsError;

  // Set hasChanges flag when selectedProducts change
  useEffect(() => {
    setHasChanges(true);
  }, [selectedProducts, setHasChanges]);

  // Only fetch products for the selected state when explicitly needed
  useEffect(() => {
    if (lastSaveTimestamp && selectedState) {
      console.log("Fetching products for state after save:", selectedState.id);
      fetchProductsForState(selectedState.id);
    }
  }, [lastSaveTimestamp, selectedState, fetchProductsForState]);

  // Fetch Alabama's products specifically on initialization
  useEffect(() => {
    if (hasInitialized && states.length > 0 && !loading) {
      const alabama = states.find(state => state.name === 'Alabama');
      if (alabama) {
        console.log("Specifically fetching Alabama's products on initialization");
        fetchProductsForState(alabama.id);
      }
    }
  }, [hasInitialized, states, loading, fetchProductsForState]);

  useEffect(() => {
    console.log("StatePermissionsManager - Auth status check:", { 
      isAuthenticated, 
      isAdmin,
      hasInitialized
    });
  }, [isAuthenticated, isAdmin, hasInitialized]);

  const handleStateClick = useCallback((stateName: string): StateOperationResult => {
    console.log("handleStateClick called with state:", stateName);
    const result = baseHandleStateClick(stateName, states, setIsDialogOpen);

    if (result.success && result.stateId) {
      fetchProductsForState(result.stateId);
    }
    
    return result;
  }, [baseHandleStateClick, states, setIsDialogOpen, fetchProductsForState]);

  const handleEditState = useCallback((state: State): StateOperationResult => {
    console.log("handleEditState called with state:", state.name);
    const result = baseHandleEditState(state, setIsDialogOpen);

    if (result.success && result.stateId) {
      fetchProductsForState(result.stateId);
    }
    
    return result;
  }, [baseHandleEditState, setIsDialogOpen, fetchProductsForState]);

  const { handleSavePermissions } = usePermissionsOperations({
    saveStatePermissions,
    performRobustRefresh,
    selectedState,
    selectedProducts,
    setIsDialogOpen,
    setHasChanges,
    hasChanges
  });

  const forceRefreshData = useCallback(async () => {
    console.log("Explicit force refresh requested");
    setShouldRefresh(true);
    await clearCache();
    const success = await refreshStateData(true);
    setShouldRefresh(false);
    
    if (success) {
      console.log("Data refreshed successfully");
      
      // After general refresh, explicitly fetch Alabama's products
      const alabama = states.find(state => state.name === 'Alabama');
      if (alabama) {
        console.log("Explicitly refreshing Alabama products after general refresh");
        await fetchProductsForState(alabama.id);
      }
      
      return true;
    } else {
      console.error("Failed to refresh data");
      return false;
    }
  }, [refreshStateData, clearCache, states, fetchProductsForState]);

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
    debugLogs,
    refreshCounter,
    hasInitialized,
    shouldRefresh,
    fetchProductsForState
  };
};
