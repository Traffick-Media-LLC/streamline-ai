
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
    if (!isAuthenticated || !isAdmin) {
      setError("Authentication required. Please ensure you're logged in as an admin.");
      setLoading(false);
      return;
    }
    
    try {
      setError(null);
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
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(`Failed to load products: ${error.message}`);
      toast.error("Failed to load products");
    }
  };

  const fetchBrands = async () => {
    if (!isAuthenticated || !isAdmin) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error('Error fetching brands:', error);
      setError(`Failed to load brands: ${error.message}`);
      toast.error("Failed to load brands");
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchProducts(), fetchBrands()]);
    setLoading(false);
  };

  useEffect(() => {
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
