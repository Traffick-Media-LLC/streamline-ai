
import { useMemo } from 'react';
import { Product, StateProduct } from '@/types/statePermissions';

export const useStateProductMapping = (
  stateProducts: StateProduct[], 
  products: Product[]
) => {
  // Create an efficient lookup for products by their ID
  const productsById = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {} as Record<number, Product>);
  }, [products]);

  // Create a mapping of state IDs to their allowed products
  const stateProductsMap = useMemo(() => {
    return stateProducts.reduce((acc, stateProduct) => {
      if (!stateProduct.state_id || !stateProduct.product_id) return acc;
      
      if (!acc[stateProduct.state_id]) {
        acc[stateProduct.state_id] = [];
      }
      
      const product = productsById[stateProduct.product_id];
      if (product) {
        acc[stateProduct.state_id].push(product);
      }
      
      return acc;
    }, {} as Record<number, Product[]>);
  }, [stateProducts, productsById]);

  // Function to get products for a state
  const getStateProducts = (stateId: number): Product[] => {
    return stateProductsMap[stateId] || [];
  };

  return { getStateProducts, stateProductsMap };
};
