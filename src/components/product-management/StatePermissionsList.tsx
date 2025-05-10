
import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { State, Product } from '@/types/statePermissions';
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

interface StatePermissionsListProps {
  states: State[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  getStateProducts: (stateId: number) => Product[];
  onEditState: (state: State) => void;
  refreshTrigger?: number;
}

export const StatePermissionsList: React.FC<StatePermissionsListProps> = ({
  states,
  searchQuery,
  onSearchChange,
  getStateProducts,
  onEditState,
  refreshTrigger
}) => {
  // Filter states based on search query
  const filteredStates = states.filter(state => 
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle refresh trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      console.log("List view refresh triggered:", refreshTrigger);
    }
  }, [refreshTrigger]);

  // Debug logging to track state products and ensure data is loaded properly
  useEffect(() => {
    if (states.length > 0) {
      console.log(`StatePermissionsList: Loaded ${states.length} states`);
      
      // Log all states and their products for debugging
      states.forEach(state => {
        try {
          const products = getStateProducts(state.id);
          console.log(`State ${state.name} (ID: ${state.id}) has ${products.length} products`);
        } catch (err) {
          console.error(`Error getting products for state ${state.name}:`, err);
        }
      });
      
      // Check for states with no products
      const statesWithNoProducts = states.filter(state => {
        const products = getStateProducts(state.id);
        return products.length === 0;
      });
      
      console.log(`Found ${statesWithNoProducts.length} states with no products`);
    } else {
      console.log('StatePermissionsList: No states loaded yet');
    }
  }, [states, getStateProducts, refreshTrigger]); // Add refreshTrigger dependency

  return (
    <div>
      <Input
        placeholder="Search states..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="max-w-xs mb-4"
      />
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>State</TableHead>
            <TableHead>Allowed Products</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredStates.length > 0 ? (
            filteredStates.map((state) => {
              let allowedProducts: Product[] = [];
              
              try {
                allowedProducts = getStateProducts(state.id);
                console.log(`Rendering state ${state.name} (ID: ${state.id}) with ${allowedProducts.length} products`);
              } catch (err) {
                console.error(`Error rendering products for state ${state.name}:`, err);
                toast.error(`Error loading products for ${state.name}`, {
                  id: `state-error-${state.id}`,
                  duration: 3000
                });
                allowedProducts = [];
              }

              return (
                <TableRow key={state.id}>
                  <TableCell className="font-medium">{state.name}</TableCell>
                  <TableCell>
                    {allowedProducts.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allowedProducts.map(product => (
                          <Badge 
                            key={product.id} 
                            variant="secondary"
                            className="text-xs"
                          >
                            {product.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No products allowed</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditState(state)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                {searchQuery ? "No states match your search" : "No states available"}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
