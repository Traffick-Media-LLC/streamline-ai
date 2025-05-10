
import { useMemo, useCallback, useEffect } from 'react';
import { Product, StateProduct } from '@/types/statePermissions';

export const useProductUtils = (stateProducts: StateProduct[], products: Product[]) => {
  // Create a memoized lookup map for products by ID for efficient retrieval
  const productsById = useMemo(() => {
    const map = new Map<number, Product>();
    products.forEach(product => {
      map.set(product.id, product);
    });
    
    console.log(`Built products lookup with ${map.size} products`);
    return map;
  }, [products]);

  // Detect and log when products are updated
  useEffect(() => {
    console.log(`Products updated: ${products.length} products available`);
  }, [products]);

  // Detect and log when state products are updated
  useEffect(() => {
    console.log(`State products updated: ${stateProducts.length} state-product relationships available`);
    
    // Log the first 5 state products to help with debugging
    if (stateProducts.length > 0) {
      console.log("Sample state products:", stateProducts.slice(0, 5));
    }
  }, [stateProducts]);

  // Create a memoized lookup for state products by state ID with improved normalization
  const stateProductsMap = useMemo(() => {
    const map = new Map<number, number[]>();
    
    console.log(`Building state products map from ${stateProducts.length} state product entries`);
    
    // First pass: normalize data and log any issues
    const normalizedStateProducts = stateProducts.map(stateProduct => {
      let stateId = stateProduct.state_id;
      let productId = stateProduct.product_id;
      
      // Ensure state_id is a number
      if (typeof stateId === 'string') {
        stateId = parseInt(stateId, 10);
        if (isNaN(stateId)) {
          console.warn(`Invalid state_id format: ${stateProduct.state_id}`);
          return null;
        }
      }
      
      // Ensure product_id is a number
      if (typeof productId === 'string') {
        productId = parseInt(productId, 10);
        if (isNaN(productId)) {
          console.warn(`Invalid product_id format: ${stateProduct.product_id}`);
          return null;
        }
      }
      
      if (!stateId || !productId) {
        console.warn(`Skipping invalid state product entry:`, stateProduct);
        return null;
      }
      
      return { stateId, productId };
    }).filter((item): item is { stateId: number; productId: number } => item !== null);
    
    console.log(`Normalized ${normalizedStateProducts.length} valid state product entries`);
    
    // Second pass: build the map
    normalizedStateProducts.forEach(({ stateId, productId }) => {
      if (!map.has(stateId)) {
        map.set(stateId, []);
      }
      
      const currentProducts = map.get(stateId) || [];
      if (!currentProducts.includes(productId)) {
        map.set(stateId, [...currentProducts, productId]);
      }
    });
    
    // Debug log the state products map
    console.log(`Built state products map with ${map.size} states`);
    map.forEach((productIds, stateId) => {
      console.log(`State ${stateId} has ${productIds.length} products`);
    });
    
    return map;
  }, [stateProducts]);

  // Get products for a specific state with enhanced logging for better debugging
  const getStateProducts = useCallback((stateId: number): Product[] => {
    if (typeof stateId !== 'number') {
      console.error(`Invalid stateId type: ${typeof stateId}, value: ${stateId}`);
      return [];
    }
    
    const productIds = stateProductsMap.get(stateId) || [];
    
    // Debug: Log detailed information about the product retrieval
    console.log(`Getting products for state ${stateId}. Found ${productIds.length} product IDs`);
    
    const stateProducts = productIds
      .map(id => {
        const product = productsById.get(id);
        if (!product) {
          console.warn(`Product ID ${id} not found in products lookup for state ${stateId}`);
        }
        return product;
      })
      .filter((product): product is Product => !!product);
    
    // Debug: Log the products found for this state
    console.log(`Retrieved ${stateProducts.length} products for state ${stateId}`);
    
    return stateProducts;
  }, [stateProductsMap, productsById]);

  // Get a list of all states that have products
  const getStatesWithProducts = useCallback((): number[] => {
    return Array.from(stateProductsMap.keys());
  }, [stateProductsMap]);

  // Check if a state has any products
  const stateHasProducts = useCallback((stateId: number): boolean => {
    if (!stateProductsMap.has(stateId)) {
      return false;
    }
    const products = stateProductsMap.get(stateId) || [];
    return products.length > 0;
  }, [stateProductsMap]);

  // Get count of states with products
  const getStatesWithProductsCount = useCallback((): number => {
    return Array.from(stateProductsMap.keys()).length;
  }, [stateProductsMap]);

  return { 
    getStateProducts,
    getStatesWithProducts,
    stateHasProducts,
    getStatesWithProductsCount
  };
};
