
import { useCallback } from 'react';
import { Product } from '@/types/statePermissions';

export const useProductUtils = (stateProducts: any[], products: Product[]) => {
  const getStateProducts = useCallback((stateId: number) => {
    const productIds = stateProducts
      .filter(sp => sp.state_id === stateId)
      .map(sp => sp.product_id || 0)
      .filter(id => id !== 0);
    
    return products.filter(product => productIds.includes(product.id));
  }, [stateProducts, products]);

  return { getStateProducts };
};
