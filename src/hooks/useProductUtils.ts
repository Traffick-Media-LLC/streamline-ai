
import { useMemo, useCallback } from 'react';
import { Product, StateProduct } from '@/types/statePermissions';

export const useProductUtils = (stateProducts: StateProduct[], products: Product[]) => {
  // Create a memoized lookup map for products by ID for efficient retrieval
  const productsById = useMemo(() => {
    const map = new Map<number, Product>();
    products.forEach(product => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  // Create a memoized lookup for state products by state ID
  const stateProductsMap = useMemo(() => {
    const map = new Map<number, number[]>();
    
    stateProducts.forEach(stateProduct => {
      if (stateProduct.state_id && stateProduct.product_id) {
        const stateId = typeof stateProduct.state_id === 'string' 
          ? parseInt(stateProduct.state_id, 10) 
          : stateProduct.state_id;
          
        const productId = typeof stateProduct.product_id === 'string' 
          ? parseInt(stateProduct.product_id, 10) 
          : stateProduct.product_id;
        
        if (!map.has(stateId)) {
          map.set(stateId, []);
        }
        
        const currentProducts = map.get(stateId) || [];
        if (!currentProducts.includes(productId)) {
          map.set(stateId, [...currentProducts, productId]);
        }
      }
    });
    
    return map;
  }, [stateProducts]);

  // Get products for a specific state with logging for debugging
  const getStateProducts = useCallback((stateId: number): Product[] => {
    const productIds = stateProductsMap.get(stateId) || [];
    
    // Debug: Log the product IDs found for this state
    console.log(`Getting products for state ${stateId}. Found ${productIds.length} product IDs:`, productIds);
    
    const stateProducts = productIds
      .map(id => productsById.get(id))
      .filter((product): product is Product => !!product);
    
    // Debug: Log the products found for this state
    console.log(`Retrieved ${stateProducts.length} products for state ${stateId}`);
    
    return stateProducts;
  }, [stateProductsMap, productsById]);

  return { getStateProducts };
};
