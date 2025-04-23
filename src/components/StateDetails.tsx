
import React from 'react';
import { StateData } from '../data/stateData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StateDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  stateName: string;
  stateData: StateData;
}

const StateDetails: React.FC<StateDetailsProps> = ({
  isOpen,
  onClose,
  stateName,
  stateData
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stateName}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-4">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stateData.status === 'green' ? '#38a169' : 
                                    stateData.status === 'yellow' ? '#ecc94b' : 
                                    stateData.status === 'red' ? '#e53e3e' : '#a0aec0' 
              }}
            />
            <span className="capitalize">{stateData.status}</span>
          </div>
          <h3 className="text-sm font-medium mb-2">Allowed Products:</h3>
          {stateData.allowedProducts.length > 0 ? (
            <ul className="list-disc pl-5">
              {stateData.allowedProducts.map((product) => (
                <li key={product}>{product}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No products allowed</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StateDetails;
