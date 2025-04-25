
import React from 'react';
import USAMap from "../USAMap";

interface StatePermissionsMapProps {
  onStateClick: (stateName: string) => void;
}

export const StatePermissionsMap: React.FC<StatePermissionsMapProps> = ({ onStateClick }) => {
  return (
    <div className="mb-8">
      <p className="text-center mb-4 text-muted-foreground">
        Click on a state to manage its allowed products
      </p>
      <USAMap onStateClick={onStateClick} />
    </div>
  );
};
