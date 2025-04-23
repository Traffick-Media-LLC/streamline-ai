
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
          <h3 className="text-sm font-medium mb-2">Allowed Products:</h3>
          {stateData.allowedProducts.length > 0 ? (
            <div className="space-y-4">
              {stateData.allowedProducts.map((brandProduct, index) => (
                <div key={`${brandProduct.brandName}-${index}`} className="border-l-4 border-primary pl-4">
                  <h4 className="font-medium text-lg mb-2">{brandProduct.brandName}</h4>
                  <ul className="list-disc pl-5">
                    {brandProduct.products.map((product, productIndex) => (
                      <li key={`${product}-${productIndex}`}>{product}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No products allowed</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StateDetails;
