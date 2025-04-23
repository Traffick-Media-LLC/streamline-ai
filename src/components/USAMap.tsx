
import { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { getStateColor } from '../utils/stateUtils';

interface USAMapProps {
  selectedState: string | null;
  setSelectedState: (state: string | null) => void;
  selectedProducts: string[];
}

const USAMap = ({ selectedState, setSelectedState, selectedProducts }: USAMapProps) => {
  const handleStateClick = (stateCode: string) => {
    setSelectedState(stateCode === selectedState ? null : stateCode);
  };

  const renderState = (props: SVGProps<SVGPathElement> & { id: string }) => {
    const stateCode = props.id;
    const isSelected = stateCode === selectedState;
    
    return (
      <path
        {...props}
        className={cn(
          "cursor-pointer transition-colors duration-200",
          "hover:fill-primary/80",
          isSelected ? "fill-primary" : getStateColor(stateCode, selectedProducts)
        )}
        onClick={() => handleStateClick(stateCode)}
      />
    );
  };

  return (
    <div className="w-full aspect-[16/10]">
      <svg
        viewBox="174 100 959 593"
        className="w-full h-full"
      >
        {/* SVG paths for each state */}
        {/* Copy all state paths from the example SVG */}
      </svg>
    </div>
  );
};

export default USAMap;
