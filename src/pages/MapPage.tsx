
import React, { useState, useEffect } from 'react';
import USAMap from '../components/USAMap';
import { supabase } from '@/integrations/supabase/client';

interface AllowedProduct {
  brand_name: string;
  product_name: string;
}

interface StateData {
  status: string;
  allowedProducts: Record<string, string[]>; // brand_name -> product_names
}

interface StateInfo {
  name: string;
  data: StateData;
}

const MapPage = () => {
  const [stateData, setStateData] = useState<Record<string, StateData>>({});
  const [selectedState, setSelectedState] = useState<StateInfo | null>(null);

  useEffect(() => {
    fetchStateData();
  }, []);

  const fetchStateData = async () => {
    try {
      // Fetch state regulations
      const { data: regulations, error: regError } = await supabase
        .from('state_regulations')
        .select('*');

      if (regError) throw regError;

      // Fetch allowed products
      const { data: products, error: prodError } = await supabase
        .from('allowed_products')
        .select('*');

      if (prodError) throw prodError;

      // Transform data
      const transformedData: Record<string, StateData> = {};
      
      // Initialize states with their status
      regulations?.forEach((reg) => {
        transformedData[reg.state_name] = {
          status: reg.status,
          allowedProducts: {}
        };
      });

      // Group products by state and brand
      products?.forEach((product) => {
        if (!transformedData[product.state_name]) {
          transformedData[product.state_name] = {
            status: 'gray',
            allowedProducts: {}
          };
        }

        if (!transformedData[product.state_name].allowedProducts[product.brand_name]) {
          transformedData[product.state_name].allowedProducts[product.brand_name] = [];
        }

        transformedData[product.state_name].allowedProducts[product.brand_name].push(
          product.product_name
        );
      });

      setStateData(transformedData);
    } catch (error) {
      console.error('Error fetching state data:', error);
    }
  };

  const handleStateClick = (stateName: string, data: StateData) => {
    console.log("State clicked:", stateName, data);
    setSelectedState({
      name: stateName,
      data
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Streamline Product Legality by State</h1>
      <USAMap stateData={stateData} onStateClick={handleStateClick} />
      
      {selectedState && (
        <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{selectedState.name}</h2>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Allowed Products:</h3>
            {Object.keys(selectedState.data.allowedProducts).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(selectedState.data.allowedProducts).map(([brand, products]) => (
                  <div key={brand} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-lg mb-2">{brand}</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {products.map((product) => (
                        <li key={product} className="text-gray-700">{product}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No products allowed</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
