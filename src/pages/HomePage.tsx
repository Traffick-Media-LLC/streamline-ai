
import { useState } from 'react';
import USAMap from '../components/USAMap';
import StateDetails from '../components/StateDetails';
import ProductFilter from '../components/ProductFilter';

const HomePage = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(['nicotine', 'thc', 'kratom']);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Streamline Product Availability</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <USAMap 
            selectedState={selectedState}
            setSelectedState={setSelectedState}
            selectedProducts={selectedProducts}
          />
        </div>
        <div className="space-y-6">
          <ProductFilter 
            selectedProducts={selectedProducts}
            setSelectedProducts={setSelectedProducts}
          />
          {selectedState && (
            <StateDetails 
              state={selectedState}
              selectedProducts={selectedProducts}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
