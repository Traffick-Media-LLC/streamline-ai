
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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

  const fetchProducts = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error("Failed to load products");
    }
  };

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error("Failed to load brands");
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchProducts(), fetchBrands()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  return {
    products,
    brands,
    loading,
    refreshData
  };
};
