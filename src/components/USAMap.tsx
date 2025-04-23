
import React from 'react';
import { stateData } from '@/data/stateData';

interface USAMapProps {
  onStateClick: (stateCode: string) => void;
  selectedState: string | null;
  selectedProducts: string[];
}

const USAMap: React.FC<USAMapProps> = ({ onStateClick, selectedState, selectedProducts }) => {
  // Function to determine state color based on selected filters
  const getStateColor = (stateCode: string): string => {
    if (selectedState === stateCode) return '#9b87f5'; // Primary purple for selected state
    
    // If no product filters are active, show default coloring
    if (selectedProducts.length === 0) return '#E5DEFF'; // Soft purple for all states
    
    const state = stateData.find(s => s.code === stateCode);
    if (!state) return '#F1F0FB'; // Default light gray
    
    // Check if state allows any of the selected products
    const hasSelectedProducts = selectedProducts.some(product => {
      const category = state.regulations[product];
      return category && category.status === 'legal';
    });
    
    return hasSelectedProducts ? '#D6BCFA' : '#FFDEE2'; // Light purple if available, soft pink if not
  };

  return (
    <div className="usa-map-container w-full overflow-x-auto">
      <svg
        viewBox="0 0 959 593"
        className="w-full h-auto"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* US States */}
        {stateData.map((state) => (
          <path
            key={state.code}
            d={state.path}
            fill={getStateColor(state.code)}
            stroke="#FFFFFF"
            strokeWidth="1"
            onClick={() => onStateClick(state.code)}
            className="cursor-pointer transition-all duration-200 hover:opacity-80"
            aria-label={state.name}
          />
        ))}
        
        {/* Add state labels for larger states */}
        {stateData.filter(state => state.showLabel).map((state) => (
          <text
            key={`label-${state.code}`}
            x={state.labelPosition?.x || 0}
            y={state.labelPosition?.y || 0}
            fontSize="10"
            fontWeight="500"
            fill="#333333"
            textAnchor="middle"
            pointerEvents="none"
          >
            {state.code}
          </text>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[#9b87f5] mr-2"></div>
          <span className="text-sm">Selected</span>
        </div>
        {selectedProducts.length > 0 && (
          <>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#D6BCFA] mr-2"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-[#FFDEE2] mr-2"></div>
              <span className="text-sm">Unavailable</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default USAMap;
