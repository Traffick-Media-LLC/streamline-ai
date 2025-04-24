
import React, { useState, useEffect } from 'react';
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pencil, Trash2, Plus, Filter, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
}

interface Product {
  id: number;
  name: string;
  brand_id: number;
  brands?: Brand;
}

const ProductsManagement: React.FC = () => {
  const { products, brands, loading, error, refreshData } = useProductsData();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrandId, setFilterBrandId] = useState<string>('');
  const [newProduct, setNewProduct] = useState({ name: '', brand_id: '' });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Add a new product
  const handleAddProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{ 
          name: newProduct.name, 
          brand_id: parseInt(newProduct.brand_id)
        }])
        .select();
      
      if (error) throw error;
      
      toast.success("Product created successfully!");
      setNewProduct({ name: '', brand_id: '' });
      setIsAddDialogOpen(false);
      refreshData();
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error("Failed to create product", {
        description: error.message
      });
    }
  };

  // Update an existing product
  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          name: editingProduct.name, 
          brand_id: editingProduct.brand_id
        })
        .eq('id', editingProduct.id);
      
      if (error) throw error;
      
      toast.success("Product updated successfully!");
      setIsEditDialogOpen(false);
      refreshData();
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error("Failed to update product", {
        description: error.message
      });
    }
  };

  // Delete a product
  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success("Product deleted successfully!");
      refreshData();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error("Failed to delete product", {
        description: error.message
      });
    }
  };

  // Filter and group products
  const filteredProducts = products
    .filter(product => {
      const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const brandMatch = !filterBrandId || product.brand_id === parseInt(filterBrandId);
      return nameMatch && brandMatch;
    })
    .reduce((acc, product) => {
      const brandId = product.brand_id;
      if (!acc[brandId]) {
        acc[brandId] = {
          brand: brands.find(b => b.id === brandId),
          products: []
        };
      }
      acc[brandId].products.push(product);
      return acc;
    }, {} as Record<number, { brand: Brand | undefined, products: Product[] }>);

  // Handle error state
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading products</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Manage Products</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Select 
              value={filterBrandId} 
              onValueChange={(value) => setFilterBrandId(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map((brand) => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {filterBrandId && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setFilterBrandId('')}
              >
                <Filter className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="brandSelect">Brand</Label>
                  <Select 
                    value={newProduct.brand_id} 
                    onValueChange={(value) => setNewProduct({ ...newProduct, brand_id: value })}
                  >
                    <SelectTrigger id="brandSelect">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id.toString()}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  onClick={handleAddProduct} 
                  disabled={!newProduct.name.trim() || !newProduct.brand_id}
                >
                  Save Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        Object.keys(filteredProducts).length > 0 ? (
          <div className="space-y-8">
            {Object.values(filteredProducts).map(({ brand, products }) => (
              <div key={brand?.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={brand?.logo_url || undefined} alt={brand?.name} />
                    <AvatarFallback>{brand?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-medium">{brand?.name || 'Unknown Brand'}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => {
                                setEditingProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchQuery || filterBrandId ? "No products match your filters" : "No products have been added yet"}
            </p>
          </div>
        )
      )}

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editBrandSelect">Brand</Label>
              <Select 
                value={editingProduct?.brand_id.toString() || ''} 
                onValueChange={(value) => setEditingProduct(prev => 
                  prev ? { ...prev, brand_id: parseInt(value) } : null
                )}
              >
                <SelectTrigger id="editBrandSelect">
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editProductName">Product Name</Label>
              <Input
                id="editProductName"
                value={editingProduct?.name || ''}
                onChange={(e) => setEditingProduct(prev => 
                  prev ? { ...prev, name: e.target.value } : null
                )}
                placeholder="Enter product name"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleUpdateProduct} 
              disabled={!editingProduct?.name.trim()}
            >
              Update Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsManagement;
