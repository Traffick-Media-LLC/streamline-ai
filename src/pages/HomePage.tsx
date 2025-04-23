
import React, { useState } from 'react';
import USAMap from '@/components/USAMap';
import StateDetails from '@/components/StateDetails';
import ProductFilter from '@/components/ProductFilter';

export const HomePage = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleStateClick = (stateCode: string) => {
    setSelectedState(stateCode);
  };

  const handleFilterChange = (products: string[]) => {
    setSelectedProducts(products);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center">Streamline Group Product Availability</h1>
      
      <div className="mb-6">
        <ProductFilter onFilterChange={handleFilterChange} selectedProducts={selectedProducts} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <USAMap onStateClick={handleStateClick} selectedState={selectedState} selectedProducts={selectedProducts} />
          </div>
        </div>
        <div>
          <div className="bg-white p-4 rounded-lg shadow-md sticky top-4">
            {selectedState ? (
              <StateDetails stateCode={selectedState} selectedProducts={selectedProducts} />
            ) : (
              <div className="text-center p-8">
                <p className="text-lg text-gray-500">Select a state to view product regulations</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
