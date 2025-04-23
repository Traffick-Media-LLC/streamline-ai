
import React, { useState } from 'react';
import USAMap from '../components/USAMap';
import StateDetails from '../components/StateDetails';
import { stateData, StateData, statusColors } from '../data/stateData';

const MapPage = () => {
  const [selectedState, setSelectedState] = useState<{ name: string; data: StateData } | null>(null);

  const handleStateClick = (stateName: string, data: StateData) => {
    setSelectedState({ name: stateName, data });
  };

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
        <StateDetails
          isOpen={!!selectedState}
          onClose={() => setSelectedState(null)}
          stateName={selectedState.name}
          stateData={selectedState.data}
        />
      )}
    </div>
  );
};

export default MapPage;
