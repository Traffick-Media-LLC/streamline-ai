
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { State, Product } from '@/types/statePermissions';

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
  const filteredStates = states.filter(state => 
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {filteredStates.map((state) => {
            const allowedProducts = getStateProducts(state.id);

            return (
              <TableRow key={state.id}>
                <TableCell className="font-medium">{state.name}</TableCell>
                <TableCell>
                  {allowedProducts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allowedProducts.map(product => (
                        <div 
                          key={product.id} 
                          className="bg-secondary text-secondary-foreground px-2 py-1 text-xs rounded-full"
                        >
                          {product.name}
                        </div>
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
          })}
        </TableBody>
      </Table>
    </div>
  );
};
