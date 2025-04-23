import React, { useState, useEffect } from 'react';
import USAMap from '../components/USAMap';
import { stateData, StateData } from '../data/stateData';
const MapPage = () => {
  const [selectedState, setSelectedState] = useState<{
    name: string;
    data: StateData;
  } | null>(null);
  const handleStateClick = (stateName: string, data: StateData) => {
    console.log("State clicked:", stateName, data);
    setSelectedState({
      name: stateName,
      data
    });
  };
  useEffect(() => {
    console.log("MapPage mounted, stateData:", stateData);
  }, []);
  return <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Streamline Product Legality by State</h1>
      <USAMap stateData={stateData} onStateClick={handleStateClick} />
      
      {selectedState && <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{selectedState.name}</h2>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Allowed Products:</h3>
            {selectedState.data.allowedProducts.length > 0 ? <ul className="list-disc pl-5 space-y-1">
                {selectedState.data.allowedProducts.map(product => <li key={product}>{product}</li>)}
              </ul> : <p className="text-gray-500">No products allowed</p>}
          </div>
        </div>}
    </div>;
};
export default MapPage;