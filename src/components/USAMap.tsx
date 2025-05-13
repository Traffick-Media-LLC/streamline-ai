
import React from 'react';
import { ComposableMap, Geographies, Geography, Annotation } from "react-simple-maps";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stateAbbreviations, smallStates } from "@/utils/stateAbbreviations";

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
                const stateAbbr = stateAbbreviations[stateName] || '';
                const isCurrentStateSelected = selectedState === stateName;
                const centroid = geo.properties.centroid || 
                                [parseFloat(geo.properties.longitude), parseFloat(geo.properties.latitude)];
                const isSmallState = smallStates.includes(stateName);
                
                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <>
                        <Geography
                          geography={geo}
                          fill={isCurrentStateSelected ? "#ea384c80" : "#ea384c"}
                          stroke="#f1f1f1"
                          strokeWidth={0.5}
                          onClick={() => {
                            console.log("Clicked state:", stateName);
                            onStateClick(stateName);
                          }}
                          style={{
                            default: { outline: "none", cursor: "pointer" },
                            hover: { outline: "none", opacity: 0.5, cursor: "pointer" },
                            pressed: { outline: "none", cursor: "pointer" }
                          }}
                        />
                        {stateAbbr && !isSmallState && (
                          <g>
                            <text
                              x={geo.centroid[0]}
                              y={geo.centroid[1]}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={isStateSelected ? 8 : 10}
                              fontWeight="500"
                              style={{
                                pointerEvents: "none", 
                                textShadow: "0px 0px 2px #000",
                                userSelect: "none"
                              }}
                            >
                              {stateAbbr}
                            </text>
                          </g>
                        )}
                      </>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={5} className="bg-black text-white px-3 py-1.5 rounded">
                      <p className="font-medium text-sm">
                        {stateName} ({stateAbbr})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            }
          </Geographies>
          
          {/* Add annotations for small states */}
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies
                .filter(geo => smallStates.includes(geo.properties.name))
                .map(geo => {
                  const stateName = geo.properties.name;
                  const stateAbbr = stateAbbreviations[stateName] || '';
                  
                  return (
                    <Annotation
                      key={`annotation-${geo.rsmKey}`}
                      subject={geo.centroid}
                      dx={0}
                      dy={0}
                      connectorProps={{
                        stroke: "transparent"
                      }}
                    >
                      <text
                        x={0}
                        y={0}
                        fontSize={7}
                        fontWeight="bold"
                        textAnchor="middle"
                        fill="#ffffff"
                        style={{
                          pointerEvents: "none",
                          textShadow: "0px 0px 2px #000",
                          userSelect: "none"
                        }}
                      >
                        {stateAbbr}
                      </text>
                    </Annotation>
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
