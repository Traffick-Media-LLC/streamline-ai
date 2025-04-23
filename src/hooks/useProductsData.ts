
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
}

interface Product {
  id: number;
  name: string;
  brand_id: number;
  brand?: Brand;
}

export const useProductsData = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();

  const fetchProducts = async () => {
    try {
      setError(null);
      console.log("Fetching products data...");
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          brand:brands (
            id,
            name,
            logo_url
          )
        `)
        .order('name');
      
      if (error) throw error;
      console.log("Products data received:", data?.length || 0, "items");
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(`Failed to load products: ${error.message}`);
      toast.error("Failed to load products");
    }
  };

  const fetchBrands = async () => {
    try {
      console.log("Fetching brands data...");
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) throw error;
      console.log("Brands data received:", data?.length || 0, "items");
      setBrands(data || []);
    } catch (error: any) {
      console.error('Error fetching brands:', error);
      setError(`Failed to load brands: ${error.message}`);
      toast.error("Failed to load brands");
    }
  };

  const refreshData = async () => {
    if (!isAuthenticated || !isAdmin) {
      console.log("Not authenticated or not admin, skipping products data fetch");
      setError("Authentication required. Please ensure you're logged in as an admin.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    console.log("Starting products data refresh...");
    await Promise.all([fetchProducts(), fetchBrands()]);
    setLoading(false);
    console.log("Products data refresh complete");
  };

  useEffect(() => {
    console.log("useProductsData hook initialized, auth state:", { isAuthenticated, isAdmin });
    refreshData();
  }, [isAuthenticated, isAdmin]);

  return {
    products,
    brands,
    loading,
    error,
    refreshData
  };
};
