
import { useState, useMemo } from 'react';
import { Product } from '@/types/statePermissions';

interface UseProductFilteringProps {
  products: Product[];
}

export const useProductFiltering = ({ products }: UseProductFilteringProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  const filteredProducts = useMemo(() => {
    // First filter products
    const filtered = products.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const brandMatch = filterBrandId === 'all' || 
        (product.brand?.id && product.brand.id === parseInt(filterBrandId));
      return nameMatch && brandMatch;
    });
    
    // Then sort products
    return [...filtered].sort((a, b) => {
      switch(sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'brand':
          const brandA = a.brand?.name || '';
          const brandB = b.brand?.name || '';
          return brandA.localeCompare(brandB) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, searchQuery, filterBrandId, sortBy]);

  return {
    searchQuery,
    setSearchQuery,
    filterBrandId,
    setFilterBrandId,
    sortBy,
    setSortBy,
    filteredProducts
  };
};
