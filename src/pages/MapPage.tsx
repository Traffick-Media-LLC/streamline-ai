
import React, { useState, useEffect } from 'react';
import USAMap from '../components/USAMap';
import { stateData, StateData, statusColors } from '../data/stateData';

const MapPage = () => {
  const [selectedState, setSelectedState] = useState<{ name: string; data: StateData } | null>(null);

  const handleStateClick = (stateName: string, data: StateData) => {
    console.log("State clicked:", stateName, data);
    setSelectedState({ name: stateName, data });
  };

  useEffect(() => {
    console.log("MapPage mounted, stateData:", stateData);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Product Legality by State
      </h1>
      <div className="mb-8">
        <div className="flex justify-center gap-6 flex-wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
      <USAMap 
        stateData={stateData} 
        onStateClick={handleStateClick} 
      />
      
      {selectedState && (
        <div className="mt-8 p-6 border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold">{selectedState.name}</h2>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: selectedState.data.status === 'green' ? '#38a169' : 
                                      selectedState.data.status === 'yellow' ? '#ecc94b' : 
                                      selectedState.data.status === 'red' ? '#e53e3e' : '#a0aec0' 
                }}
              />
              <span className="capitalize">{selectedState.data.status}</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Allowed Products:</h3>
            {selectedState.data.allowedProducts.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {selectedState.data.allowedProducts.map((product) => (
                  <li key={product}>{product}</li>
                ))}
              </ul>
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
