
import { useQuery } from '@tanstack/react-query';
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
  const { isAuthenticated, isAdmin } = useAuth();

  const fetchProducts = async () => {
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
    return data || [];
  };

  const fetchBrands = async () => {
    console.log("Fetching brands data...");
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    
    if (error) throw error;
    console.log("Brands data received:", data?.length || 0, "items");
    return data || [];
  };

  // Use React Query for products
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: isAuthenticated && isAdmin,
    staleTime: 1000 * 60 * 2, // 2 minutes
    meta: {
      onError: (error: any) => {
        console.error('Error fetching products:', error);
        toast.error("Failed to load products");
      }
    }
  });

  // Use React Query for brands
  const brandsQuery = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
    enabled: isAuthenticated && isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
    meta: {
      onError: (error: any) => {
        console.error('Error fetching brands:', error);
        toast.error("Failed to load brands");
      }
    }
  });

  const refreshData = async () => {
    if (!isAuthenticated || !isAdmin) {
      console.log("Not authenticated or not admin, skipping products data fetch");
      return;
    }
    
    console.log("Starting products data refresh...");
    await Promise.all([
      productsQuery.refetch(),
      brandsQuery.refetch()
    ]);
    console.log("Products data refresh complete");
  };

  return {
    products: productsQuery.data || [],
    brands: brandsQuery.data || [],
    loading: productsQuery.isLoading || brandsQuery.isLoading,
    error: productsQuery.error ? (productsQuery.error as Error).message : null,
    refreshData
  };
};
