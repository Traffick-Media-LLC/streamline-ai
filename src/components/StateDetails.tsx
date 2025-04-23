
import React from 'react';
import { stateData } from '@/data/stateData';

interface StateDetailsProps {
  stateCode: string;
  selectedProducts: string[];
}

interface RegulationDetail {
  status: string;
  description: string;
}

const StateDetails: React.FC<StateDetailsProps> = ({ stateCode, selectedProducts }) => {
  const state = stateData.find(s => s.code === stateCode);
  
  if (!state) {
    return <div>State information not found</div>;
  }

  // Filter regulations based on selectedProducts or show all if none selected
  const filteredRegulations = selectedProducts.length > 0
    ? Object.entries(state.regulations).filter(([key]) => selectedProducts.includes(key))
    : Object.entries(state.regulations);
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'legal':
        return <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>;
      case 'restricted':
        return <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>;
      case 'illegal':
        return <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-300 mr-2"></div>;
    }
  };
  
  const getProductName = (key: string): string => {
    const productNames: Record<string, string> = {
      'nicotine': 'Nicotine Products',
      'thc': 'Hemp Derived THC',
      'kratom': 'Kratom Products'
    };
    
    return productNames[key] || key;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">{state.name}</h2>
      
      {filteredRegulations.length > 0 ? (
        <div className="space-y-4">
          {filteredRegulations.map(([key, regulation]) => {
            // Type assertion to ensure regulation is treated as RegulationDetail
            const typedRegulation = regulation as RegulationDetail;
            
            return (
              <div key={key} className="border-b pb-3">
                <div className="flex items-center mb-1">
                  {getStatusIcon(typedRegulation.status)}
                  <h3 className="font-medium text-lg">{getProductName(key)}</h3>
                </div>
                <div className="ml-6">
                  <p className="text-sm text-gray-600">{typedRegulation.description}</p>
                </div>
                <div className="ml-6 mt-1">
                  <div className="text-xs inline-block px-2 py-1 bg-gray-100 rounded-full">
                    Status: <span className="font-medium capitalize">{typedRegulation.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No regulation information available.</p>
      )}
    </div>
  );
};

export default StateDetails;
