
import { useState, useCallback, useMemo } from 'react';
import { useStatePermissionsData } from './useStatePermissionsData';
import { useProductsData } from './useProductsData';
import { useStatePermissionsOperations } from './useStatePermissionsOperations';
import { State, Product } from '@/types/statePermissions';

export const useStatePermissionsManager = () => {
  const { states, stateProducts, loading: statesLoading, error: statesError, refreshData } = useStatePermissionsData();
  const { products, brands, loading: productsLoading, error: productsError } = useProductsData();
  const { saveStatePermissions, isSaving } = useStatePermissionsOperations();
  
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loading = statesLoading || productsLoading;
  const error = statesError || productsError;

  const handleStateClick = useCallback((stateName: string) => {
    const state = states.find(s => s.name === stateName);
    if (state) {
      const allowedProductIds = stateProducts
        .filter(sp => sp.state_id === state.id)
        .map(sp => sp.product_id || 0)
        .filter(id => id !== 0);
      
      setSelectedState(state);
      setSelectedProducts(allowedProductIds);
      setIsDialogOpen(true);
    }
  }, [states, stateProducts]);

  const handleSavePermissions = async () => {
    if (!selectedState) return;
    
    const success = await saveStatePermissions(selectedState.id, selectedProducts);
    if (success) {
      setIsDialogOpen(false);
      refreshData();
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
    const allowedProductIds = stateProducts
      .filter(sp => sp.state_id === state.id)
      .map(sp => sp.product_id || 0)
      .filter(id => id !== 0);
    
    setSelectedState(state);
    setSelectedProducts(allowedProductIds);
    setIsDialogOpen(true);
  }, [stateProducts]);

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
    refreshData
  };
};
