
import { useState, useMemo } from 'react';
import { Product } from '@/types/statePermissions';

interface UseProductFilteringProps {
  products: Product[];
}

export const useProductFiltering = ({ products }: UseProductFilteringProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('all');

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const brandMatch = filterBrandId === 'all' || product.brand?.id === parseInt(filterBrandId);
      return nameMatch && brandMatch;
    });
  }, [products, searchQuery, filterBrandId]);

  return {
    searchQuery,
    setSearchQuery,
    filterBrandId,
    setFilterBrandId,
    filteredProducts
  };
};
