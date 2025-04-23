
import { useState, useRef, useEffect } from 'react';

interface USAMapSVGProps {
  onStateClick: (stateCode: string) => void;
  selectedState: string | null;
  getStateColor: (stateCode: string) => string;
}

const USAMapSVG: React.FC<USAMapSVGProps> = ({ onStateClick, selectedState, getStateColor }) => {
  const [hoverState, setHoverState] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState<number>(800);
  
  // Resize handler for responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setWidth(container.clientWidth);
        }
      }
    };
    
    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox="0 0 959 593"
        width={width}
        height={width * 0.618} // Golden ratio for aesthetics
      >
        {/* States SVG paths */}
        <g>
          {/* Alabama */}
          <path
            d="M628.6,466.8 l-1.6,-0.8 l-2.1,-0.6 l-1.2,-1.9 l-0.8,-3.3 l-2.9,-3.5 l-0.8,-5.6 l0.8,-2.5 l2,-1.8 l0.4,-3.9 l0.6,-3.5 l0.5,-0.7 l-1.7,-0.9 l-2.5,-2.3 l0.5,-2.8 l37.5,-4.1 l0.2,2.5 l2.2,3.1 l2,6.1 l3.3,7.8 l2.3,9.9 l1.4,6.1 l1.6,4.8 l-0.1,2.1 l-1.7,1.1 l-2.7,3 l-2.3,0.1 l-3.7,2.8 l-0.6,8.6 l-0.4,1.9 l0.8,1 l1.1,2.3 l0.5,1.7 l-0.1,3.3 l-0.1,1.9 l-0.6,0.6 l0.3,4.8 l-0.3,0.5 l-38.3,3.5 l-22.3,2.6 z"
            onClick={() => onStateClick('AL')}
            onMouseEnter={() => setHoverState('AL')}
            onMouseLeave={() => setHoverState(null)}
            fill={getStateColor('AL')}
            stroke={selectedState === 'AL' || hoverState === 'AL' ? '#000000' : '#FFFFFF'}
            strokeWidth={selectedState === 'AL' || hoverState === 'AL' ? 2 : 1}
          />
          {/* More state paths will go here, but I'm including only Alabama as an example */}
          {/* You would need to add paths for all 50 states here */}
          {/* For brevity, I've only included Alabama. In a real implementation, you would include all states */}
        </g>
      </svg>
      {hoverState && (
        <div className="absolute top-0 left-0 bg-white/80 px-2 py-1 rounded text-xs font-medium">
          {hoverState}
        </div>
      )}
    </div>
  );
};

export default USAMapSVG;
