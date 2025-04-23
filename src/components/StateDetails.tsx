
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import type { ProductCategory } from '@/pages/HomePage';
import type { StateStatus } from '@/components/USAMap';

interface StateDetailsProps {
  stateCode: string;
  productCategory: ProductCategory;
}

interface StateInfo {
  name: string;
  nicotine: ProductInfo;
  hemp: ProductInfo;
  kratom: ProductInfo;
}

interface ProductInfo {
  status: StateStatus;
  details: string;
  products: {
    name: string;
    allowed: boolean;
    notes: string;
  }[];
}

const STATE_NAMES: {[key: string]: string} = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
  "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
  "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho",
  "IL": "Illinois", "IN": "Indiana", "IA": "Iowa", "KS": "Kansas",
  "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi",
  "MO": "Missouri", "MT": "Montana", "NE": "Nebraska", "NV": "Nevada",
  "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
  "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma",
  "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
  "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia",
  "WI": "Wisconsin", "WY": "Wyoming", "DC": "District of Columbia"
};

const StatusBadge = ({ status }: { status: StateStatus }) => {
  switch(status) {
    case 'available':
      return <Badge className="bg-green-500">Available</Badge>;
    case 'restricted':
      return <Badge className="bg-yellow-500">Restricted</Badge>;
    case 'prohibited':
      return <Badge className="bg-red-500">Prohibited</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const StateDetails: React.FC<StateDetailsProps> = ({ stateCode, productCategory }) => {
  const [stateInfo, setStateInfo] = useState<StateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProductCategory>(productCategory !== 'all' ? productCategory : 'nicotine');

  useEffect(() => {
    if (productCategory !== 'all') {
      setActiveTab(productCategory);
    }
  }, [productCategory]);

  useEffect(() => {
    const fetchStateDetails = async () => {
      setIsLoading(true);
      
      try {
        const stateName = STATE_NAMES[stateCode];
        
        // Query for state-specific knowledge entries
        const { data, error } = await supabase
          .from('knowledge_entries')
          .select('*')
          .or(`title.ilike.%${stateName}%,content.ilike.%${stateName}%`)
          .filter('is_active', 'eq', true);
        
        if (error) throw error;
        
        // Default state info with placeholder data
        const defaultStateInfo: StateInfo = {
          name: stateName,
          nicotine: {
            status: 'unknown',
            details: 'No specific information available.',
            products: []
          },
          hemp: {
            status: 'unknown',
            details: 'No specific information available.',
            products: []
          },
          kratom: {
            status: 'unknown',
            details: 'No specific information available.',
            products: []
          }
        };
        
        // Process data to extract product information
        if (data && data.length > 0) {
          data.forEach(entry => {
            // Process for nicotine products
            if (entry.tags && entry.tags.includes('nicotine')) {
              defaultStateInfo.nicotine = processProductEntry(entry, defaultStateInfo.nicotine);
            }
            
            // Process for hemp products
            if (entry.tags && entry.tags.includes('hemp')) {
              defaultStateInfo.hemp = processProductEntry(entry, defaultStateInfo.hemp);
            }
            
            // Process for kratom products
            if (entry.tags && entry.tags.includes('kratom')) {
              defaultStateInfo.kratom = processProductEntry(entry, defaultStateInfo.kratom);
            }
          });
        }
        
        setStateInfo(defaultStateInfo);
      } catch (error) {
        console.error('Error fetching state details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStateDetails();
  }, [stateCode]);

  // Helper function to process a knowledge entry into product info
  const processProductEntry = (entry: any, currentInfo: ProductInfo): ProductInfo => {
    const content = entry.content.toLowerCase();
    let status: StateStatus = currentInfo.status;
    
    // Determine status based on content
    if (content.includes('prohibited') || content.includes('illegal') || content.includes('not allowed')) {
      status = 'prohibited';
    } else if (content.includes('restricted') || content.includes('limitation') || content.includes('regulated')) {
      status = 'restricted';
    } else if (content.includes('available') || content.includes('legal') || content.includes('allowed')) {
      status = 'available';
    }
    
    // Extract product list if available
    const products = currentInfo.products;
    
    // Simple extraction of product names from content
    // In a real app, you'd have a more sophisticated approach
    const productMatches = content.match(/\b(vapes?|e-?liquids?|pouches|delta-?8|delta-?9|thca|thcp|kratom)\b/gi);
    if (productMatches) {
      const uniqueProducts = [...new Set(productMatches)];
      uniqueProducts.forEach(product => {
        const productName = product.trim();
        const isAllowed = !content.includes(`${productName.toLowerCase()} not allowed`) && 
                       !content.includes(`${productName.toLowerCase()} prohibited`) &&
                       !content.includes(`${productName.toLowerCase()} illegal`);
                       
        // Add to products if not already present
        if (!products.some(p => p.name.toLowerCase() === productName.toLowerCase())) {
          products.push({
            name: productName,
            allowed: isAllowed,
            notes: ""
          });
        }
      });
    }
    
    return {
      status,
      details: entry.content,
      products
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!stateInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No information available</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not fetch information for this state.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{stateInfo.name}</CardTitle>
          <div className="flex space-x-2">
            <StatusBadge status={stateInfo[activeTab].status} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ProductCategory)}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="nicotine">Nicotine</TabsTrigger>
            <TabsTrigger value="hemp">Hemp THC</TabsTrigger>
            <TabsTrigger value="kratom">Kratom</TabsTrigger>
          </TabsList>
          
          <TabsContent value="nicotine">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Regulatory Status</h3>
                <p className="text-sm">{stateInfo.nicotine.details}</p>
              </div>
              
              {stateInfo.nicotine.products.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Products</h3>
                  <ul className="space-y-2">
                    {stateInfo.nicotine.products.map((product, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        {product.allowed ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span>{product.name}</span>
                        {product.notes && <span className="text-xs text-muted-foreground">({product.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="hemp">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Regulatory Status</h3>
                <p className="text-sm">{stateInfo.hemp.details}</p>
              </div>
              
              {stateInfo.hemp.products.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Products</h3>
                  <ul className="space-y-2">
                    {stateInfo.hemp.products.map((product, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        {product.allowed ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span>{product.name}</span>
                        {product.notes && <span className="text-xs text-muted-foreground">({product.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="kratom">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Regulatory Status</h3>
                <p className="text-sm">{stateInfo.kratom.details}</p>
              </div>
              
              {stateInfo.kratom.products.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Products</h3>
                  <ul className="space-y-2">
                    {stateInfo.kratom.products.map((product, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        {product.allowed ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                        <span>{product.name}</span>
                        {product.notes && <span className="text-xs text-muted-foreground">({product.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StateDetails;
