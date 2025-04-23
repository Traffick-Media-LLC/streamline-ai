
import React, { useState, useEffect } from 'react';
import USAMap from '../components/USAMap';
import { supabase } from "@/integrations/supabase/client";
import { StateData } from '../data/stateData';
import { useQuery } from '@tanstack/react-query';

async function fetchStateProducts(stateName: string) {
  const { data: products, error } = await supabase
    .from('state_allowed_products')
    .select(`
      products (
        name,
        brands (
          name
        )
      ),
      states!inner (
        name
      )
    `)
    .eq('states.name', stateName);

  if (error) {
    console.error('Error fetching state products:', error);
    return { allowedProducts: [] };
  }

  // Transform the data into the expected format
  const brandProducts = products.reduce((acc: { brandName: string; products: string[] }[], item) => {
    const brandName = item.products.brands.name;
    const productName = item.products.name;
    
    const existingBrand = acc.find(b => b.brandName === brandName);
    if (existingBrand) {
      existingBrand.products.push(productName);
    } else {
      acc.push({ brandName, products: [productName] });
    }
    
    return acc;
  }, []);

  return { allowedProducts: brandProducts };
}

const MapPage = () => {
  const [selectedState, setSelectedState] = useState<{
    name: string;
    data: StateData;
  } | null>(null);

  const { data: stateData } = useQuery({
    queryKey: ['stateProducts', selectedState?.name],
    queryFn: () => selectedState ? fetchStateProducts(selectedState.name) : null,
    enabled: !!selectedState
  });

  const handleStateClick = (stateName: string) => {
    console.log("State clicked:", stateName);
    setSelectedState({
      name: stateName,
      data: { allowedProducts: [] } // Initial empty state, will be updated by the query
    });
  };

  // Update the selected state data when the query resolves
  useEffect(() => {
    if (stateData && selectedState) {
      setSelectedState(prev => prev ? {
        ...prev,
        data: stateData
      } : null);
    }
  }, [stateData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Streamline Product Legality by State</h1>
      <USAMap onStateClick={handleStateClick} />
      
      {selectedState && (
        <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{selectedState.name}</h2>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Allowed Products by Brand:</h3>
            {selectedState.data.allowedProducts.length > 0 ? (
              <div className="space-y-4">
                {selectedState.data.allowedProducts.map(({ brandName, products }) => (
                  <div key={brandName} className="border-l-4 border-primary pl-4">
                    <h4 className="font-medium text-lg mb-2">{brandName}</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {products.map(product => (
                        <li key={product}>{product}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No products allowed in this state</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
