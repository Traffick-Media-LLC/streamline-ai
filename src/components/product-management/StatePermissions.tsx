
import React, { useState } from 'react';
import { useStatePermissionsData } from "@/hooks/useStatePermissionsData";
import { useProductsData } from "@/hooks/useProductsData";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Check, Trash2, Plus, Filter, MapPin, List, Search 
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import USAMap from "../USAMap";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface State {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  brand_id: number;
  brand?: {
    id: number;
    name: string;
    logo_url: string | null;
  };
}

interface StateProduct {
  id: number;
  state_id: number;
  product_id: number;
}

const StatePermissions: React.FC = () => {
  const { states, stateProducts, loading: statesLoading, refreshData: refreshStateData } = useStatePermissionsData();
  const { products, loading: productsLoading } = useProductsData();
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('');
  const [brands, setBrands] = useState<{id: number; name: string}[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // Populate brands from products when products are loaded
  React.useEffect(() => {
    if (products.length > 0) {
      // Extract unique brands for filtering
      const uniqueBrands = Array.from(
        new Set(products.map(product => product.brand_id))
      ).map(brandId => {
        const product = products.find(p => p.brand_id === brandId);
        return {
          id: brandId,
          name: product?.brand?.name || 'Unknown'
        };
      });
      
      setBrands(uniqueBrands);
    }
  }, [products]);

  const handleStateClick = (stateName: string) => {
    const state = states.find(s => s.name === stateName);
    if (state) {
      setSelectedState(state);
      
      // Pre-select products that are already allowed in this state
      const allowedProductIds = stateProducts
        .filter(sp => sp.state_id === state.id)
        .map(sp => sp.product_id);
      
      setSelectedProducts(allowedProductIds);
      setIsAddDialogOpen(true);
    }
  };

  // Save state-product permissions
  const handleSavePermissions = async () => {
    if (!selectedState) return;
    
    try {
      // First delete existing relationships for this state
      const { error: deleteError } = await supabase
        .from('state_allowed_products')
        .delete()
        .eq('state_id', selectedState.id);
      
      if (deleteError) throw deleteError;
      
      // Then insert new relationships
      if (selectedProducts.length > 0) {
        const newRelations = selectedProducts.map(productId => ({
          state_id: selectedState.id,
          product_id: productId
        }));
        
        const { error: insertError } = await supabase
          .from('state_allowed_products')
          .insert(newRelations);
        
        if (insertError) throw insertError;
      }
      
      toast(`Updated allowed products for ${selectedState.name}.`);
      
      setIsAddDialogOpen(false);
      refreshStateData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast(`Failed to update state permissions. Please try again.`);
    }
  };

  // Toggle product selection
  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Get products allowed in a state
  const getStateAllowedProducts = (stateId: number) => {
    const allowedProductIds = stateProducts
      .filter(sp => sp.state_id === stateId)
      .map(sp => sp.product_id);
    
    return products.filter(product => allowedProductIds.includes(product.id));
  };

  // Filter products based on search and brand filter
  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const brandMatch = !filterBrandId || product.brand_id === parseInt(filterBrandId);
    return nameMatch && brandMatch;
  });

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

      {statesLoading || productsLoading ? (
        <div className="flex justify-center my-12">
          <p>Loading state permissions...</p>
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
          <div className="flex gap-4 mb-4">
            <Input
              placeholder="Search states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
          </div>
          
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
                  const allowedProducts = getStateAllowedProducts(state.id);
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
                              .map(sp => sp.product_id);
                            setSelectedProducts(allowedProductIds);
                            setIsAddDialogOpen(true);
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

      {/* State Permissions Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedState?.name} - Allowed Products
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select 
                value={filterBrandId} 
                onValueChange={(value) => setFilterBrandId(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Brands</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Select</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Brand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          className={selectedProducts.includes(product.id) ? 'bg-primary text-primary-foreground border-primary' : ''}
                          onClick={() => toggleProductSelection(product.id)}
                        >
                          {selectedProducts.includes(product.id) && <Check className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.brand?.logo_url && (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={product.brand.logo_url} alt={product.brand?.name} />
                              <AvatarFallback>{product.brand?.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          {product.brand?.name || 'Unknown'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        <p className="text-muted-foreground">
                          {searchQuery || filterBrandId ? "No products match your filters" : "No products available"}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedProducts([])}
            >
              Clear All
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Select all visible products
                const visibleProductIds = filteredProducts.map(p => p.id);
                setSelectedProducts(prev => {
                  const existingNotVisible = prev.filter(id => !visibleProductIds.includes(id));
                  return [...existingNotVisible, ...visibleProductIds];
                });
              }}
            >
              Select All Visible
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePermissions}>
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatePermissions;
