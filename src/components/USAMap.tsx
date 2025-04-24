
import React from 'react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface USAMapProps {
  onStateClick: (stateName: string) => void;
  isStateSelected?: boolean;
  selectedState?: string | null;
}

const USAMap: React.FC<USAMapProps> = ({ 
  onStateClick, 
  isStateSelected, 
  selectedState 
}) => {
  return (
    <div className={`w-full aspect-[1.5] mx-auto transition-all duration-300 ease-in-out ${
      isStateSelected ? 'max-w-2xl' : 'max-w-5xl'
    }`}>
      <TooltipProvider delayDuration={0}>
        <ComposableMap projection="geoAlbersUsa">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const isCurrentStateSelected = selectedState === stateName;
                
                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <Geography
                        geography={geo}
                        fill={isCurrentStateSelected ? "#F1F1F1" : "#ea384c"}
                        stroke="#f1f1f1"
                        strokeWidth={0.5}
                        onClick={() => {
                          console.log("Clicked state:", stateName);
                          onStateClick(stateName);
                        }}
                        style={{
                          default: { 
                            outline: "none", 
                            cursor: "pointer",
                            fill: "#F1F1F1" 
                          },
                          hover: { 
                            outline: "none", 
                            opacity: 0.8, 
                            cursor: "pointer",
                            fill: "#F1F1F1"
                          },
                          pressed: { 
                            outline: "none", 
                            cursor: "pointer" 
                          }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={5} className="bg-black text-white px-3 py-1.5 rounded">
                      <p className="font-medium text-sm">{stateName}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </TooltipProvider>
    </div>
  );
};

export default USAMap;

