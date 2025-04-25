
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";

interface Product {
  id: number;
  name: string;
  brand?: {
    id: number;
    name: string;
    logo_url: string | null;
  };
}

interface Brand {
  id: number;
  name: string;
}

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  brands: Brand[];
  selectedProducts: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const ProductSelectionDialog: React.FC<ProductSelectionDialogProps> = ({
  open,
  onOpenChange,
  products,
  brands,
  selectedProducts,
  onSelectionChange,
  onSave,
  isSaving
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('');

  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const brandMatch = !filterBrandId || product.brand?.id === parseInt(filterBrandId);
    return nameMatch && brandMatch;
  });

  const toggleProductSelection = (productId: number) => {
    onSelectionChange(
      selectedProducts.includes(productId)
        ? selectedProducts.filter(id => id !== productId)
        : [...selectedProducts, productId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Allowed Products</DialogTitle>
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
              onValueChange={setFilterBrandId}
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
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onSelectionChange([])}
          >
            Clear All
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              const visibleProductIds = filteredProducts.map(p => p.id);
              onSelectionChange(prev => {
                const existingNotVisible = prev.filter(id => !visibleProductIds.includes(id));
                return [...existingNotVisible, ...visibleProductIds];
              });
            }}
          >
            Select All Visible
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
