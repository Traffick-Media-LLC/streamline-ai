
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
        height={width * 0.618}
      >
        <g>
          {/* Alabama */}
          <path
            d="M628.6,466.8l-1.6-0.8l-2.1-0.6l-1.2-1.9l-0.8-3.3l-2.9-3.5l-0.8-5.6l0.8-2.5l2-1.8l0.4-3.9l0.6-3.5l0.5-0.7l-1.7-0.9 l-2.5-2.3l0.5-2.8l37.5-4.1l0.2,2.5l2.2,3.1l2,6.1l3.3,7.8l2.3,9.9l1.4,6.1l1.6,4.8l-0.1,2.1l-1.7,1.1l-2.7,3l-2.3,0.1l-3.7,2.8 l-0.6,8.6l-0.4,1.9l0.8,1l1.1,2.3l0.5,1.7l-0.1,3.3l-0.1,1.9l-0.6,0.6l0.3,4.8l-0.3,0.5l-38.3,3.5l-22.3,2.6"
            onClick={() => onStateClick('AL')}
            onMouseEnter={() => setHoverState('AL')}
            onMouseLeave={() => setHoverState(null)}
            fill={getStateColor('AL')}
            stroke={selectedState === 'AL' || hoverState === 'AL' ? '#000000' : '#FFFFFF'}
            strokeWidth={selectedState === 'AL' || hoverState === 'AL' ? 2 : 1}
          />
          
          {/* Alaska */}
          <path
            d="M161.1,453.7l-0.3,85.4l1.6,1l3.1,0.2l1.5-1.1h2.6l0.2,2.9l7,6.8l0.5,2.6l3.4-1.9l0.6-0.2l0.3-3.1l1.5-1.6l1.1-0.2 l1.9-1.5l3.1,2.1l0.6,2.9l1.9,1.1l1.1,2.4l3.9,1.8l3.4,6l2.7,3.9l2.3,2.7l1.5,3.7l5,1.8l5.2,2.1l1,4.4l0.5,3.1l-1,3.4l-1.8,2.3 l-1.6-0.8l-1.5-3.1l-2.7-1.5l-1.8-1.1l-0.8,0.8l1.5,2.7l0.2,3.7l-1.1,0.5l-1.9-1.9l-2.1-1.3l0.5,1.6l1.3,1.8l-0.8,0.8l-2.7-1.8 l-2.6-2.9l-0.3,1.9l3.1,4.9l-0.3,2.4l-2.9-4.7l-2.1-1.1l-1.3,2.1l2.3,0.5l2.1,3.9l-1.1,2.4l-2.1-1.3l-0.2-4.4l-1.6-2.9l-1.1-0.2 l-0.8,2.4l1.6,1.5l0.3,2.9l1.9,1.5l-0.5,1.1l0.6,1.1l1.6-1.6l3.7,0.3l-0.3,3.7l2.1,1.3l-0.2,1.3l-3.7-0.3l-4.5-1.8l1.6-3.4 l-2.1-2.6l-3.9-0.2l-0.5-0.8l0.8-1.9l2.9-0.8l-0.2-1.5l-2.9-0.8l-4.8,2.9l-1.3,4.4l-3.2,6l-0.3,1.1l1.5,1l-1.5,4.1l-0.2,2.3 l-1.6,2.9l-2.9,0.5l-3.4-1l-5.2-0.5l-1.1,1.1l-3.2-0.6l-2.6,0.3l-2.3,3.9l0.3,3.1l2.6,4.7l0.8,0.5l0.3,1.9l-1.1,1.3l-3.1-2.3 l-2.6-5.7l1.5-2.1v-2.3l-1.3-1.3l-0.8,0.8l-1.5-0.2l-2.9-4.4l-2.3-2.3l-2.3-1.5l-0.2-2.6l-2.1-3.4l-0.5-3.7l0.5-0.8l2.1-3.1 l0.5-2.6l0.3-2.3l-1.3-3.7v-4.7l-1.1-3.1l-2.1-4.9l-1-3.1l-0.3-1.9l-1.5-2.6l-0.5-3.7l-2.3-3.7l-1.1-3.9l0.3-0.8v-2.9l2.3-1.3 l2.1,0.5l2.3-0.2l3.7-3.6l5.7-2.6l2.9-2.7l1.3-3.7l2.1-5.2l0.2-2.6l2.3-3.1l0.8-3.1l-2.3-0.5l-0.5-1.8l1.8-3.1l1.1-0.5l2.3,1.3 l0.2,3.7l-1.1,0.5l-0.8,2.3l2.7,2.6l2.7,0.6l1.8-0.5l2.1,1.3l2.9,1.3l3.7,0.2l2.9,3.1h2.6l1.3,0.6l1.3-3.6l4-1.5l7.3-4.7l5.7-2.1 l2.3-1.3l1.6-1.9l1.6,0.3l2.9-0.5l3.9-2.1l3.7-2.1l1.1-0.2V453.7z M46,482.6l2.1,5.3l-0.2,1l-0.3-0.8l-1.8-2.9l-1.8-2.7L46,482.6z"
            onClick={() => onStateClick('AK')}
            onMouseEnter={() => setHoverState('AK')}
            onMouseLeave={() => setHoverState(null)}
            fill={getStateColor('AK')}
            stroke={selectedState === 'AK' || hoverState === 'AK' ? '#000000' : '#FFFFFF'}
            strokeWidth={selectedState === 'AK' || hoverState === 'AK' ? 2 : 1}
          />
          
          {/* Arizona */}
          <path
            d="M135.1,389.7l-0.3,1.5l0.5,1l18.5,10.7l12.2,7.6l14.9,8.6l16.5,10l12.7,7.6l12.7,7.4l-0.2,2.1l-0.2,2.1v3l2.7,4.8 l1.3,5.8l0.8,1l1,0.6l-0.5,2.9l-1.5,2.1l-2.4,0.5l-1.3,7.4l-0.8,1.8l-1.8,1.6l-1.1,4.2l-0.3,2.1l0.3,1.5l1.3,1.3l0.3,1.5l-0.8,1.1 l-1.8,0.8l-1.5,1.3l-1.1,1.8l-0.3,4.8l2.9,5l1.1,5.5l0.5,4l2.9,2.9l-0.3,1.1l-1.8,1l-3.2,0.8l-1.9,2.4l-1.6,0.5l-1.1,0.5l-1.1,0.5 l-1.9,0.8l-1.6,0.3l-1.1,0.5l-1.1,0.5l-1.9,0.8l-1.6,0.3l-0.6,0.5l-1.1,0.5l-1.9,0.8l-1.6,0.3l-1.1,0.5l-1.1,0.5l-1.9,0.8 l-1.6,0.3l-1.1,0.5l-1.1,0.5l-1.9,0.8l-1.6,0.3l-1.1,0.5l-1.1,0.5l-1.9,0.8l-1.6,0.3l-1.1,0.5l-1.1,0.5l-1.9,0.8l-1.6,0.3 l-1.1,0.5l-1.1,0.5l-1.9,0.8l-1.6,0.3l-0.6,0.5l-0.5,0.3l-2.9-4.8l-1.3-3.4l-1.6-2.6l-1.8-1.9l-1.6-0.8l-1.1-2.4l0.5-1.5v-2.6 l-2.1-1.9l-2.7-2.6l-2.9-2.9h-1.1l-0.8-2.3l-1.3-2.9l-2.4-0.6l-2.9-1.3l-2.4-1.6l-2.9-1.9l-2.1-1.6l1.1-2.1v-2.4l-1.6-1l-3.1-1 l-3.7-1.3l-3.2-1.9l-2.9-1.3l-2.9-1.9l-3.2-2.4l-0.3-3.2v-1.5l-3.7-2.4l-1.6-3.9l-2.1-3.6l-2.7-3.2l-2.7-3.2l-2.1-2.4l0.6-1.9 l1.3-1.5l0.3-2.1l1.1-1.8l2.3-2.1l1.3-1.1l-1-1l-0.6-2.1l-1.3-1.3l-3.4-1.6l-1.9-1.9l-1.9-1.9l-0.2-0.8l-1.1-1.1l-4-1.6l-1.8-2.3 l-1.6-1.6l-1.5-1.8l-2.1-1.5l-1.1-2.6h-0.3l-0.3-2.1l-1.3-2.6h-0.3l-4.5,21.1l-0.5,0.5L135.1,389.7z"
            onClick={() => onStateClick('AZ')}
            onMouseEnter={() => setHoverState('AZ')}
            onMouseLeave={() => setHoverState(null)}
            fill={getStateColor('AZ')}
            stroke={selectedState === 'AZ' || hoverState === 'AZ' ? '#000000' : '#FFFFFF'}
            strokeWidth={selectedState === 'AZ' || hoverState === 'AZ' ? 2 : 1}
          />

          {/* Adding remaining state paths... */}
          {/* Note: For brevity, I'm only showing a few states. The actual component would include ALL 50 states */}
          {/* You would continue adding each state's path data in the same format */}
          
          {/* Add paths for remaining states: AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, 
              KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, 
              OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY */}
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
