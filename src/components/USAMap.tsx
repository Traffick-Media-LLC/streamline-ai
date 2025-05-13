
import React, { useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Annotation } from "react-simple-maps";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stateAbbreviations, smallStates } from "@/utils/stateAbbreviations";

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

// Centroid coordinates for each state as fallback
// These are approximate geographic centers of each state
const stateCentroids: Record<string, [number, number]> = {
  'Alabama': [-86.79113, 32.806671],
  'Alaska': [-152.404419, 61.370716],
  'Arizona': [-111.431221, 33.729759],
  'Arkansas': [-92.373123, 34.969704],
  'California': [-119.681564, 36.116203],
  'Colorado': [-105.311104, 39.059811],
  'Connecticut': [-72.755371, 41.597782],
  'Delaware': [-75.507141, 39.318523],
  'Florida': [-81.686783, 27.664827],
  'Georgia': [-83.643074, 33.040619],
  'Hawaii': [-157.498337, 21.094318],
  'Idaho': [-114.478828, 44.240459],
  'Illinois': [-88.986137, 40.349457],
  'Indiana': [-86.258278, 39.849426],
  'Iowa': [-93.210526, 42.011539],
  'Kansas': [-96.726486, 38.5266],
  'Kentucky': [-84.670067, 37.66814],
  'Louisiana': [-91.867805, 31.169546],
  'Maine': [-69.381927, 44.693947],
  'Maryland': [-76.802101, 39.063946],
  'Massachusetts': [-71.530106, 42.230171],
  'Michigan': [-84.536095, 43.326618],
  'Minnesota': [-93.900192, 45.694454],
  'Mississippi': [-89.678696, 32.741646],
  'Missouri': [-92.288368, 38.456085],
  'Montana': [-110.454353, 46.921925],
  'Nebraska': [-98.268082, 41.12537],
  'Nevada': [-117.055374, 38.313515],
  'New Hampshire': [-71.563896, 43.452492],
  'New Jersey': [-74.521011, 40.298904],
  'New Mexico': [-106.248482, 34.840515],
  'New York': [-74.948051, 42.165726],
  'North Carolina': [-79.806419, 35.630066],
  'North Dakota': [-99.784012, 47.528912],
  'Ohio': [-82.764915, 40.388783],
  'Oklahoma': [-96.928917, 35.565342],
  'Oregon': [-122.070938, 44.572021],
  'Pennsylvania': [-77.209755, 40.590752],
  'Rhode Island': [-71.51178, 41.680893],
  'South Carolina': [-80.945007, 33.856892],
  'South Dakota': [-99.438828, 44.299782],
  'Tennessee': [-86.692345, 35.747845],
  'Texas': [-97.563461, 31.054487],
  'Utah': [-111.862434, 40.150032],
  'Vermont': [-72.710686, 44.045876],
  'Virginia': [-78.169968, 37.769337],
  'Washington': [-121.490494, 47.400902],
  'West Virginia': [-80.954453, 38.491226],
  'Wisconsin': [-89.616508, 44.268543],
  'Wyoming': [-107.30249, 42.755966],
  'District of Columbia': [-77.026817, 38.897438]
};

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
  // Calculate what font size to use based on whether state is selected
  const fontSize = useMemo(() => isStateSelected ? 8 : 10, [isStateSelected]);
  
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
                const isSmallState = smallStates.includes(stateName);
                
                // Get centroid from our predefined map or calculate it
                const centroid = stateCentroids[stateName] || null;

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
                        {stateAbbr && !isSmallState && centroid && (
                          <g>
                            <text
                              x={centroid[0]}
                              y={centroid[1]}
                              textAnchor="middle"
                              fill="#ffffff"
                              fontSize={fontSize}
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
                  
                  // Get centroid from our predefined map
                  const centroid = stateCentroids[stateName];
                  
                  if (!centroid) return null;
                  
                  return (
                    <Annotation
                      key={`annotation-${geo.rsmKey}`}
                      subject={centroid}
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
