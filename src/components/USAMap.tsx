
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCategory } from '@/pages/HomePage';
import { Skeleton } from '@/components/ui/skeleton';
import USAMapSVG from './USAMapSVG';

interface USAMapProps {
  onStateClick: (stateCode: string) => void;
  selectedState: string | null;
  productCategory: ProductCategory;
}

export type StateStatus = "available" | "restricted" | "prohibited" | "unknown";

type StateData = {
  [stateCode: string]: {
    nicotine: StateStatus;
    hemp: StateStatus;
    kratom: StateStatus;
  };
};

const USAMap: React.FC<USAMapProps> = ({ onStateClick, selectedState, productCategory }) => {
  const [stateData, setStateData] = useState<StateData>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStateData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch all state regulatory data from the knowledge_entries table
        const { data, error } = await supabase
          .from('knowledge_entries')
          .select('*')
          .filter('tags', 'cs', '{"state"}');
        
        if (error) throw error;
        
        const statesData: StateData = {};
        
        // Process the data to organize by state
        data?.forEach(entry => {
          const stateCode = getStateCodeFromTitle(entry.title);
          if (stateCode) {
            // Initialize state data if not exists
            if (!statesData[stateCode]) {
              statesData[stateCode] = {
                nicotine: getProductStatus(entry, 'nicotine'),
                hemp: getProductStatus(entry, 'hemp'),
                kratom: getProductStatus(entry, 'kratom'),
              };
            }
          }
        });
        
        setStateData(statesData);
      } catch (error) {
        console.error('Error fetching state data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStateData();
  }, []);

  // Extract state code from entry title (e.g., "New York" -> "NY")
  const getStateCodeFromTitle = (title: string): string | null => {
    // This is a simplified implementation
    // In a real app, you'd have a proper mapping
    const stateMapping: {[key: string]: string} = {
      "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
      "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
      "Florida": "FL", "Georgia": "GA", "Hawaii": "HI", "Idaho": "ID",
      "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
      "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
      "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
      "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
      "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
      "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
      "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
      "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT",
      "Vermont": "VT", "Virginia": "VA", "Washington": "WA", "West Virginia": "WV",
      "Wisconsin": "WI", "Wyoming": "WY"
    };
    
    // Try to find the state code
    for (const [stateName, stateCode] of Object.entries(stateMapping)) {
      if (title.includes(stateName)) {
        return stateCode;
      }
    }
    
    return null;
  };
  
  // Determine product status based on entry content
  const getProductStatus = (entry: any, product: string): StateStatus => {
    const content = entry.content.toLowerCase();
    
    if (entry.tags && entry.tags.includes(product)) {
      if (content.includes('prohibited') || content.includes('illegal') || content.includes('not allowed')) {
        return 'prohibited';
      } else if (content.includes('restricted') || content.includes('limitation') || content.includes('regulated')) {
        return 'restricted';
      } else if (content.includes('available') || content.includes('legal') || content.includes('allowed')) {
        return 'available';
      }
    }
    
    return 'unknown';
  };

  // Get the appropriate status color based on product category
  const getStateColor = (stateCode: string): string => {
    if (!stateData[stateCode]) {
      return '#e2e2e2'; // Gray for unknown status
    }
    
    let status: StateStatus;
    
    if (productCategory === 'all') {
      // For "all", use the most restrictive status
      const statuses = [stateData[stateCode].nicotine, stateData[stateCode].hemp, stateData[stateCode].kratom];
      if (statuses.includes('prohibited')) {
        status = 'prohibited';
      } else if (statuses.includes('restricted')) {
        status = 'restricted';
      } else if (statuses.includes('available')) {
        status = 'available';
      } else {
        status = 'unknown';
      }
    } else {
      status = stateData[stateCode][productCategory];
    }
    
    // Map status to color
    switch (status) {
      case 'available':
        return '#34D399'; // green-400
      case 'restricted':
        return '#FBBF24'; // yellow-400
      case 'prohibited':
        return '#F87171'; // red-400
      default:
        return '#e2e2e2'; // Gray for unknown
    }
  };

  if (isLoading) {
    return <Skeleton className="w-full h-[500px] rounded-md" />;
  }

  return (
    <div className="usa-map-container">
      <USAMapSVG
        onStateClick={onStateClick}
        selectedState={selectedState}
        getStateColor={getStateColor}
      />
    </div>
  );
};

export default USAMap;
