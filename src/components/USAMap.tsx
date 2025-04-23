
import React, { useEffect } from 'react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { statusColors, StateData } from '../data/stateData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface USAMapProps {
  stateData: Record<string, StateData>;
  onStateClick: (stateName: string, data: StateData) => void;
}

const USAMap: React.FC<USAMapProps> = ({ stateData, onStateClick }) => {
  useEffect(() => {
    console.log("USAMap mounted, stateData:", stateData);
  }, [stateData]);

  return (
    <div className="w-full aspect-[1.5] max-w-5xl mx-auto border border-gray-300 rounded-lg">
      <TooltipProvider>
        <ComposableMap projection="geoAlbersUsa">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const data = stateData[stateName] || { status: 'gray', allowedProducts: [] };
                const color = statusColors[data.status];

                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <Geography
                        geography={geo}
                        fill={color}
                        onClick={() => onStateClick(stateName, data)}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", opacity: 0.8 },
                          pressed: { outline: "none" }
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{stateName}</p>
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
