
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterControls } from "./FilterControls";
import { ProductsTable } from "./ProductsTable";
import { useProductFiltering } from "@/hooks/useProductFiltering";
import { Product, Brand } from '@/types/statePermissions';
import { Loader2 } from 'lucide-react';

interface ProductSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  brands: Brand[];
  selectedProducts: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onSave: () => void;
  isSaving: boolean;
  hasChanges?: boolean;
  stateName?: string;
}

export const ProductSelectionDialog: React.FC<ProductSelectionDialogProps> = ({
  open,
  onOpenChange,
  products,
  brands,
  selectedProducts,
  onSelectionChange,
  onSave,
  isSaving,
  hasChanges = false,
  stateName
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

  // Prevent unintentional closing when saving
  const handleOpenChange = (open: boolean) => {
    if (!open && isSaving) {
      return;
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {stateName ? 
              `Select Allowed Products for ${stateName}` : 
              'Select Allowed Products'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {selectedProducts.length === 0 ? 
                "No products selected" : 
                `${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'} selected`}
            </p>
          </div>

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
            disabled={isSaving || selectedProducts.length === 0}
          >
            Clear All
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSelectAllVisible}
            disabled={isSaving || filteredProducts.length === 0}
          >
            Select All Visible
          </Button>
          <Button 
            onClick={onSave} 
            disabled={isSaving || !hasChanges}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Permissions'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
