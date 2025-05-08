
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
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loading = statesLoading || productsLoading || isRefreshing;
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

  // Enhanced refresh function with multiple attempts and proper error handling
  const performRobustRefresh = useCallback(async (forceRefresh = false) => {
    console.log("Performing robust data refresh...");
    setIsRefreshing(true);
    
    try {
      const success = await refreshData(forceRefresh);
      
      if (!success && refreshAttempts < 3) {
        console.log(`Refresh attempt ${refreshAttempts + 1} failed, trying again...`);
        setRefreshAttempts(prev => prev + 1);
        
        // Exponential backoff
        const delay = Math.pow(2, refreshAttempts) * 500;
        setTimeout(() => performRobustRefresh(true), delay);
        return false;
      } else if (!success) {
        console.error("Multiple refresh attempts failed");
        toast.error("Failed to refresh data after multiple attempts");
        return false;
      } else {
        console.log("Data refreshed successfully");
        setRefreshAttempts(0);
        return true;
      }
    } catch (error) {
      console.error("Error during refresh:", error);
      toast.error("Error refreshing data");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, refreshAttempts]);
  
  // Initial data loading
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      performRobustRefresh();
    }
  }, [isAuthenticated, isAdmin, performRobustRefresh]);

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
          
          // If we're still on the same state, update the selection to match the database
          if (selectedState?.id === savedStateId) {
            const currentStateProducts = stateProducts
              .filter(sp => sp.state_id === savedStateId)
              .map(sp => sp.product_id || 0)
              .filter(id => id !== 0);
              
            console.log("Updated product IDs after refresh:", currentStateProducts);
            
            // Only update if different
            if (JSON.stringify(currentStateProducts) !== JSON.stringify(selectedProducts)) {
              console.log("Updating selected products to match database");
              setSelectedProducts(currentStateProducts);
            }
          }
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
    debugLogs
  };
};
