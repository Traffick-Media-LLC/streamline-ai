
import React, { useState, useEffect, useCallback } from 'react';
import USAMap from '../components/USAMap';
import StateNotes from '../components/StateNotes';
import { supabase } from "@/integrations/supabase/client";
import { StateData } from '../data/stateData';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from "@/components/ui/sonner";

async function fetchStateProducts(stateName: string) {
  console.log(`Fetching products for state: ${stateName}`);
  
  const {
    data: products,
    error
  } = await supabase.from('state_allowed_products').select(`
      products (
        name,
        brands (
          name
        )
      ),
      states!inner (
        name
      )
    `).eq('states.name', stateName);
    
  if (error) {
    console.error('Error fetching state products:', error);
    return {
      allowedProducts: []
    };
  }

  console.log(`Received ${products.length} products for state: ${stateName}`);
  
  const brandProducts = products.reduce((acc: {
    brandName: string;
    products: string[];
  }[], item) => {
    const brandName = item.products.brands.name;
    const productName = item.products.name;
    const existingBrand = acc.find(b => b.brandName === brandName);
    if (existingBrand) {
      existingBrand.products.push(productName);
    } else {
      acc.push({
        brandName,
        products: [productName]
      });
    }
    return acc;
  }, []);
  
  return {
    allowedProducts: brandProducts
  };
}

const MapPage = () => {
  const [selectedState, setSelectedState] = useState<{
    name: string;
    data: StateData;
    id?: number;
  } | null>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const {
    data: stateData,
    error,
    refetch
  } = useQuery({
    queryKey: ['stateProducts', selectedState?.name],
    queryFn: () => selectedState ? fetchStateProducts(selectedState.name) : null,
    enabled: !!selectedState,
    staleTime: 1000 * 30, // 30 seconds - more responsive for user interaction
    meta: {
      onError: () => {
        toast.error(`Error loading data for ${selectedState?.name}`);
      }
    }
  });
  
  // Function to manually refresh data
  const refreshData = useCallback(() => {
    if (selectedState) {
      console.log(`Manually refreshing data for ${selectedState.name}`);
      queryClient.invalidateQueries({ queryKey: ['stateProducts', selectedState.name] });
      return refetch();
    }
    return Promise.resolve();
  }, [selectedState, refetch, queryClient]);

  const handleStateClick = (stateName: string) => {
    console.log("State clicked:", stateName);
    
    // First get the state ID from our states table
    const fetchStateId = async () => {
      const { data: stateData, error } = await supabase
        .from('states')
        .select('id')
        .eq('name', stateName)
        .single();
      
      if (error) {
        console.error('Error fetching state ID:', error);
        return null;
      }
      
      return stateData?.id;
    };

    fetchStateId().then((stateId) => {
      setSelectedState({
        name: stateName,
        id: stateId || undefined,
        data: {
          allowedProducts: []
        } // Initial empty state, will be updated by the query
      });
    });
  };

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("Error fetching state data:", error);
    }
  }, [error]);

  useEffect(() => {
    if (stateData && selectedState) {
      console.log(`Updating state data for ${selectedState.name} with ${stateData.allowedProducts.length} brand categories`);
      setSelectedState(prev => prev ? {
        ...prev,
        data: stateData
      } : null);
    }
  }, [stateData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Streamline Product Legality by State</h1>
      
      <div className={`flex ${isMobile ? 'flex-col' : 'items-start h-[calc(100vh-12rem)]'} gap-8 transition-all duration-300 ease-in-out`}>
        <div className={`transition-all duration-300 ease-in-out ${
          selectedState && !isMobile ? 'w-1/2 sticky top-24' : 'w-full'
        }`}>
          <USAMap 
            onStateClick={handleStateClick} 
            isStateSelected={!!selectedState}
            selectedState={selectedState?.name}
          />
        </div>
        
        {selectedState && (
          <div className={`${isMobile ? 'w-full' : 'w-1/2 overflow-y-auto'} animate-fade-in`} 
               style={!isMobile ? { maxHeight: 'calc(100vh - 12rem)' } : undefined}>
            <div className="p-6 border border-gray-200 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">{selectedState.name}</h2>
                <button 
                  onClick={refreshData}
                  className="text-xs text-primary hover:underline"
                >
                  Refresh
                </button>
              </div>
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
          </div>
        )}
      </div>

      {/* State Notes Section - Below the map */}
      {selectedState && selectedState.id && (
        <div className={`mt-8 transition-all duration-300 ease-in-out ${
          selectedState && !isMobile ? 'w-1/2' : 'w-full'
        }`}>
          <StateNotes 
            stateName={selectedState.name}
            stateId={selectedState.id}
          />
        </div>
      )}
    </div>
  );
};

export default MapPage;
