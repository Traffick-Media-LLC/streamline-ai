
import React, { useEffect } from 'react';
import USAMap from "../USAMap";

interface StatePermissionsMapProps {
  onStateClick: (stateName: string) => void;
  refreshTrigger?: number; // Add a prop to trigger refresh
}

export const StatePermissionsMap: React.FC<StatePermissionsMapProps> = ({ 
  onStateClick,
  refreshTrigger
}) => {
  // Add effect to handle refresh trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      console.log("Map view refresh triggered:", refreshTrigger);
    }
  }, [refreshTrigger]);

  return (
    <div className="mb-8">
      <p className="text-center mb-4 text-muted-foreground">
        Click on a state to manage its allowed products
      </p>
      <USAMap onStateClick={onStateClick} />
    </div>
  );
};
