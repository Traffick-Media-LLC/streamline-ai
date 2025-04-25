
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterControls } from "./FilterControls";
import { ProductsTable } from "./ProductsTable";
import { useProductFiltering } from "@/hooks/useProductFiltering";
import { Product, Brand } from '@/types/statePermissions';

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
  const {
    searchQuery,
    setSearchQuery,
    filterBrandId,
    setFilterBrandId,
    filteredProducts
  } = useProductFiltering({ products });

  const toggleProductSelection = (productId: number) => {
    const newSelectedProducts = selectedProducts.includes(productId)
      ? selectedProducts.filter(id => id !== productId)
      : [...selectedProducts, productId];
      
    onSelectionChange(newSelectedProducts);
  };

  const handleSelectAllVisible = () => {
    const visibleProductIds = filteredProducts.map(p => p.id);
    
    // Create a new array with existing non-visible products and all visible ones
    const newSelectedProducts = [
      ...selectedProducts.filter(id => !visibleProductIds.includes(id)),
      ...visibleProductIds
    ];
    
    onSelectionChange(newSelectedProducts);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Allowed Products</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <FilterControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterBrandId={filterBrandId}
            onBrandFilterChange={setFilterBrandId}
            brands={brands}
          />

          <ProductsTable
            products={filteredProducts}
            selectedProducts={selectedProducts}
            onToggleProduct={toggleProductSelection}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={handleClearAll}
          >
            Clear All
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSelectAllVisible}
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
