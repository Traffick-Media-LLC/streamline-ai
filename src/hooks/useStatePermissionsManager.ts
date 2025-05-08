
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
    hasInitialized
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
    debugLogs 
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
    performRobustRefresh 
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
  const handleStateClick = useCallback((stateName: string) => {
    console.log("handleStateClick called with state:", stateName);
    return baseHandleStateClick(stateName, states, setIsDialogOpen);
  }, [baseHandleStateClick, states, setIsDialogOpen]);

  // Wrap the base edit state handler with setIsDialogOpen
  const handleEditState = useCallback((state: State) => {
    console.log("handleEditState called with state:", state.name);
    return baseHandleEditState(state, setIsDialogOpen);
  }, [baseHandleEditState, setIsDialogOpen]);

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

  const forceRefreshData = useCallback(() => {
    console.log("Forcing data refresh");
    return performRobustRefresh(true);
  }, [performRobustRefresh]);

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
