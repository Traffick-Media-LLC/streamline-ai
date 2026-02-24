
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
  is_visible: boolean;
}

const BrandsManagement: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBrand, setNewBrand] = useState({ name: '', logo_url: '' });
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();

  // Fetch all brands
  const fetchBrands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brands. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  // Add a new brand
  const handleAddBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert([{ 
          name: newBrand.name, 
          logo_url: newBrand.logo_url.trim() || null 
        }])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Brand created successfully!",
      });

      setNewBrand({ name: '', logo_url: '' });
      setIsAddDialogOpen(false);
      fetchBrands();
    } catch (error) {
      console.error('Error adding brand:', error);
      toast({
        title: "Error",
        description: "Failed to create brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update an existing brand
  const handleUpdateBrand = async () => {
    if (!editingBrand) return;
    
    try {
      const { error } = await supabase
        .from('brands')
        .update({ 
          name: editingBrand.name, 
          logo_url: editingBrand.logo_url?.trim() || null 
        })
        .eq('id', editingBrand.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Brand updated successfully!",
      });
      
      setIsEditDialogOpen(false);
      fetchBrands();
    } catch (error) {
      console.error('Error updating brand:', error);
      toast({
        title: "Error",
        description: "Failed to update brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Toggle brand visibility
  const handleToggleVisibility = async (id: number, is_visible: boolean) => {
    try {
      const { error } = await supabase
        .from('brands')
        .update({ is_visible } as any)
        .eq('id', id);
      
      if (error) throw error;
      
      setBrands(prev => prev.map(b => b.id === id ? { ...b, is_visible } : b));
      toast({
        title: "Success",
        description: `Brand ${is_visible ? 'shown' : 'hidden'} successfully!`,
      });
    } catch (error) {
      console.error('Error toggling brand visibility:', error);
      toast({
        title: "Error",
        description: "Failed to update brand visibility.",
        variant: "destructive",
      });
    }
  };

  // Delete a brand
  const handleDeleteBrand = async (id: number) => {
    if (!confirm("Are you sure you want to delete this brand? This will also delete all associated products.")) return;
    
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Brand deleted successfully!",
      });
      
      fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "Failed to delete brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter brands based on search query
  const filteredBrands = brands.filter(brand => 
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Manage Brands</h2>
        <div className="flex gap-4">
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Brand
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Brand</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  <Input
                    id="brandName"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    placeholder="Enter brand name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                  <Input
                    id="logoUrl"
                    value={newBrand.logo_url}
                    onChange={(e) => setNewBrand({ ...newBrand, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                {newBrand.logo_url && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Preview:</p>
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={newBrand.logo_url} alt="Preview" />
                      <AvatarFallback>{newBrand.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddBrand} disabled={!newBrand.name.trim()}>Save Brand</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <p>Loading brands...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrands.length > 0 ? (
            filteredBrands.map((brand) => (
              <Card key={brand.id} className={`overflow-hidden transition-opacity ${!brand.is_visible ? 'opacity-50' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={brand.logo_url || undefined} alt={brand.name} />
                        <AvatarFallback>{brand.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {brand.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={brand.is_visible}
                        onCheckedChange={(checked) => handleToggleVisibility(brand.id, checked)}
                        aria-label={`Toggle visibility for ${brand.name}`}
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          setEditingBrand(brand);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteBrand(brand.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Logo URL: {brand.logo_url || "None"}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? "No brands match your search" : "No brands have been added yet"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Brand Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editBrandName">Brand Name</Label>
              <Input
                id="editBrandName"
                value={editingBrand?.name || ''}
                onChange={(e) => setEditingBrand(prev => 
                  prev ? { ...prev, name: e.target.value } : null
                )}
                placeholder="Enter brand name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editLogoUrl">Logo URL (optional)</Label>
              <Input
                id="editLogoUrl"
                value={editingBrand?.logo_url || ''}
                onChange={(e) => setEditingBrand(prev => 
                  prev ? { ...prev, logo_url: e.target.value } : null
                )}
                placeholder="https://example.com/logo.png"
              />
            </div>
            {editingBrand?.logo_url && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Preview:</p>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={editingBrand.logo_url} alt="Preview" />
                  <AvatarFallback>{editingBrand.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleUpdateBrand} 
              disabled={!editingBrand?.name.trim()}
            >
              Update Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandsManagement;
