
import React from 'react';
import { Button } from '@/components/ui/button';

interface ProductFilterProps {
  onFilterChange: (products: string[]) => void;
  selectedProducts: string[];
}

const ProductFilter: React.FC<ProductFilterProps> = ({ onFilterChange, selectedProducts }) => {
  const products = [
    { id: 'nicotine', label: 'Nicotine Products' },
    { id: 'thc', label: 'Hemp Derived THC' },
    { id: 'kratom', label: 'Kratom Products' },
  ];

  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      onFilterChange(selectedProducts.filter(id => id !== productId));
    } else {
      onFilterChange([...selectedProducts, productId]);
    }
  };

  const clearFilters = () => {
    onFilterChange([]);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2">
        <h2 className="text-lg font-semibold mb-2 sm:mb-0">Filter by Product Category</h2>
        {selectedProducts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-sm">
            Clear Filters
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {products.map((product) => (
          <Button
            key={product.id}
            variant={selectedProducts.includes(product.id) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleProduct(product.id)}
            className="text-sm"
          >
            {product.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ProductFilter;
