
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterControls } from "./FilterControls";
import { ProductsTable } from "./ProductsTable";
import { Product, Brand } from '@/types/statePermissions';
import { Loader2, Check } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Apply filtering and sorting to products
  const filteredProducts = useMemo(() => {
    // First filter products
    const filtered = products.filter(product => {
      const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const brandMatch = filterBrandId === 'all' || 
        (product.brand?.id && product.brand.id === parseInt(filterBrandId));
      return nameMatch && brandMatch;
    });
    
    // Then sort products
    return [...filtered].sort((a, b) => {
      switch(sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'brand':
          const brandA = a.brand?.name || '';
          const brandB = b.brand?.name || '';
          return brandA.localeCompare(brandB) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [products, searchQuery, filterBrandId, sortBy]);

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

  // Clear visible selections - only removes currently visible products
  const handleClearVisible = () => {
    const visibleProductIds = filteredProducts.map(p => p.id);
    const newSelectedProducts = selectedProducts.filter(id => !visibleProductIds.includes(id));
    onSelectionChange(newSelectedProducts);
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
      <DialogContent className="max-w-4xl flex flex-col max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {stateName ? 
              `Select Allowed Products for ${stateName}` : 
              'Select Allowed Products'}
          </DialogTitle>
        </DialogHeader>

        {/* Content area with scrolling */}
        <div className="flex-grow overflow-y-auto py-4">
          <FilterControls
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterBrandId={filterBrandId}
            onBrandFilterChange={setFilterBrandId}
            brands={brands}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedCount={selectedProducts.length}
            totalCount={products.length}
          />

          <ProductsTable
            products={filteredProducts}
            selectedProducts={selectedProducts}
            onToggleProduct={toggleProductSelection}
          />
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 bg-background pt-2 border-t border-border">
          <DialogFooter className="flex-wrap gap-2 sm:space-x-0">
            <div className="flex items-center gap-2 w-full justify-start">
              <Button 
                variant="outline" 
                onClick={handleClearVisible}
                disabled={isSaving || filteredProducts.filter(p => selectedProducts.includes(p.id)).length === 0}
                size="sm"
              >
                Clear Visible
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSelectAllVisible}
                disabled={isSaving || filteredProducts.length === 0}
                size="sm"
              >
                Select Visible
              </Button>
              <Button 
                variant="outline" 
                onClick={handleClearAll}
                disabled={isSaving || selectedProducts.length === 0}
                size="sm"
              >
                Clear All
              </Button>
            </div>
            
            <div className="w-full flex justify-end mt-4 sm:mt-0">
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
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Permissions
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

