
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

// Define a proper return type for state operations
interface StateOperationResult {
  success: boolean;
  stateId?: number;
}

export const useStatePermissionsManager = () => {
  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  
  // Data fetching hooks
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

  // Refactored UI state hooks
  const { 
    searchQuery, 
    setSearchQuery, 
    viewMode, 
    setViewMode, 
    isDialogOpen, 
    setIsDialogOpen 
  } = useStateUIControls();

  // State selection hook
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

  // Data sync hook
  const { 
    isRefreshing, 
    performRobustRefresh,
    clearCache
  } = useStatePermissionsSync(refreshStateData);

  // Product utilities
  const { getStateProducts } = useProductUtils(stateProducts, products);

  // Combined loading state
  const loading = statesLoading || productsLoading || isRefreshing;
  const error = statesError || productsError;

  // Effect to track selected products changes
  useEffect(() => {
    setHasChanges(true);
  }, [selectedProducts, setHasChanges]);
  
  // Effect to refresh data when last save timestamp changes
  useEffect(() => {
    if (lastSaveTimestamp && selectedState) {
      console.log("Last save timestamp changed, fetching fresh data for selected state");
      // Fetch fresh data for the current state
      fetchProductsForState(selectedState.id);
    }
  }, [lastSaveTimestamp, selectedState, fetchProductsForState]);

  // Effect to check authentication status
  useEffect(() => {
    console.log("StatePermissionsManager - Auth status check:", { 
      isAuthenticated, 
      isAdmin, 
      isGuest,
      hasInitialized
    });
  }, [isAuthenticated, isAdmin, isGuest, hasInitialized]);
  
  // Wrap the base state click handler to include the states array and setIsDialogOpen
  const handleStateClick = useCallback((stateName: string): StateOperationResult => {
    console.log("handleStateClick called with state:", stateName);
    
    const result = baseHandleStateClick(stateName, states, setIsDialogOpen);
    
    // After handling state click, fetch the latest products for this state directly
    if (result.success && result.stateId) {
      console.log("Fetching fresh product data for selected state:", result.stateId);
      fetchProductsForState(result.stateId);
    }
    
    return result;
  }, [baseHandleStateClick, states, setIsDialogOpen, fetchProductsForState]);

  // Wrap the base edit state handler with setIsDialogOpen
  const handleEditState = useCallback((state: State): StateOperationResult => {
    console.log("handleEditState called with state:", state.name);
    
    const result = baseHandleEditState(state, setIsDialogOpen);
    
    // After editing state, fetch the latest products for this state directly
    if (result.success && result.stateId) {
      console.log("Fetching fresh product data for edited state:", result.stateId);
      fetchProductsForState(result.stateId);
    }
    
    return result;
  }, [baseHandleEditState, setIsDialogOpen, fetchProductsForState]);

  // Permission operations hook
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
    console.log("Forcing data refresh with cache clearing");
    await clearCache();
    return performRobustRefresh(true);
  }, [performRobustRefresh, clearCache]);

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
    debugLogs,
    refreshCounter,
    hasInitialized
  };
};
