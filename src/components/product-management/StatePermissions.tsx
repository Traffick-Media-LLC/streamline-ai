
import React, { useState } from 'react';
import { useStatePermissionsData } from "@/hooks/useStatePermissionsData";
import { useProductsData } from "@/hooks/useProductsData";
import { useStatePermissionsOperations } from "@/hooks/useStatePermissionsOperations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, RefreshCw, MapPin, List } from "lucide-react";
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import USAMap from "../USAMap";

const StatePermissions: React.FC = () => {
  const { states, stateProducts, loading: statesLoading, error: statesError, refreshData } = useStatePermissionsData();
  const { products, brands, loading: productsLoading, error: productsError } = useProductsData();
  const { saveStatePermissions, isSaving } = useStatePermissionsOperations();
  
  const [selectedState, setSelectedState] = useState<{id: number; name: string} | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleStateClick = (stateName: string) => {
    const state = states.find(s => s.name === stateName);
    if (state) {
      const allowedProductIds = stateProducts
        .filter(sp => sp.state_id === state.id)
        .map(sp => sp.product_id || 0)
        .filter(id => id !== 0);
      
      setSelectedState(state);
      setSelectedProducts(allowedProductIds);
      setIsDialogOpen(true);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedState) return;
    
    const success = await saveStatePermissions(selectedState.id, selectedProducts);
    if (success) {
      setIsDialogOpen(false);
      refreshData();
    }
  };

  const error = statesError || productsError;
  const loading = statesLoading || productsLoading;

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} className="mt-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Manage State Permissions</h2>
        <div className="flex gap-4">
          <Button 
            variant={viewMode === 'map' ? 'default' : 'outline'} 
            onClick={() => setViewMode('map')}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Map View
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            onClick={() => setViewMode('list')}
          >
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : viewMode === 'map' ? (
        <div className="mb-8">
          <p className="text-center mb-4 text-muted-foreground">
            Click on a state to manage its allowed products
          </p>
          <USAMap onStateClick={handleStateClick} />
        </div>
      ) : (
        <div className="mb-8">
          <Input
            placeholder="Search states..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              {states
                .filter(state => state.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((state) => {
                  const allowedProducts = stateProducts
                    .filter(sp => sp.state_id === state.id)
                    .map(sp => products.find(p => p.id === sp.product_id))
                    .filter((p): p is NonNullable<typeof p> => p !== undefined);

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
                          onClick={() => {
                            setSelectedState(state);
                            const allowedProductIds = stateProducts
                              .filter(sp => sp.state_id === state.id)
                              .map(sp => sp.product_id || 0)
                              .filter(id => id !== 0);
                            setSelectedProducts(allowedProductIds);
                            setIsDialogOpen(true);
                          }}
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
      )}

      <ProductSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        products={products}
        brands={brands}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        onSave={handleSavePermissions}
        isSaving={isSaving}
      />
    </div>
  );
};

export default StatePermissions;
