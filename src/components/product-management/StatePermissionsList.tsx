
import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { State, Product } from '@/types/statePermissions';
import { Badge } from "@/components/ui/badge";

interface StatePermissionsListProps {
  states: State[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  getStateProducts: (stateId: number) => Product[];
  onEditState: (state: State) => void;
}

export const StatePermissionsList: React.FC<StatePermissionsListProps> = ({
  states,
  searchQuery,
  onSearchChange,
  getStateProducts,
  onEditState
}) => {
  // Filter states based on search query
  const filteredStates = states.filter(state => 
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debug logging to track state products
  useEffect(() => {
    if (states.length > 0) {
      // Log a sample of states and their products for debugging
      const sampleStates = states.slice(0, 3);
      sampleStates.forEach(state => {
        const products = getStateProducts(state.id);
        console.log(`State ${state.name} (ID: ${state.id}) has ${products.length} products`);
      });
    }
  }, [states, getStateProducts]);

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
              const allowedProducts = getStateProducts(state.id);

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
