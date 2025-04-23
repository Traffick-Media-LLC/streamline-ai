
import React from 'react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { StateData, statusColors } from '../data/stateData';
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
  return (
    <div className="w-full aspect-[1.5] max-w-5xl mx-auto">
      <TooltipProvider delayDuration={0}>
        <ComposableMap projection="geoAlbersUsa">
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const data = stateData[stateName] || { status: 'gray', allowedProducts: {} };
                const fillColor = statusColors[data.status] || "#a0aec0";

                return (
                  <Tooltip key={geo.rsmKey}>
                    <TooltipTrigger asChild>
                      <Geography
                        geography={geo}
                        fill={fillColor}
                        stroke="#f1f1f1"
                        strokeWidth={0.5}
                        onClick={() => {
                          console.log("Clicked state:", stateName);
                          onStateClick(stateName, data);
                        }}
                        style={{
                          default: { outline: "none", cursor: "pointer" },
                          hover: { outline: "none", opacity: 0.8, cursor: "pointer" },
                          pressed: { outline: "none", cursor: "pointer" }
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
