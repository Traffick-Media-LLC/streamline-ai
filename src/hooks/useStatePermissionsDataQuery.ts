
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { State, StateProduct, SavePermissionResult } from '@/types/statePermissions';

export const useStatePermissionsDataQuery = () => {
  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all states
  const statesQuery = useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      console.log("Fetching states data...");
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');
      
      if (error) throw error;
      console.log("States data received:", data?.length || 0, "items");
      return data || [];
    },
    enabled: isAuthenticated || isGuest,
    staleTime: 1000 * 60 * 15, // 15 minutes - states rarely change
    meta: {
      onError: (error: any) => {
        console.error('Error fetching states:', error);
        toast.error("Failed to load states data");
      }
    }
  });

  // Fetch all state product permissions in one query
  const stateProductsQuery = useQuery({
    queryKey: ['stateProducts'],
    queryFn: async () => {
      console.log("Fetching state products data...");
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*');
      
      if (error) throw error;
      console.log("State products data received:", data?.length || 0, "items");
      
      // Normalize state products data
      return data?.map(item => ({
        ...item,
        state_id: typeof item.state_id === 'string' ? parseInt(item.state_id, 10) : item.state_id,
        product_id: typeof item.product_id === 'string' ? parseInt(item.product_id, 10) : item.product_id
      })) || [];
    },
    enabled: isAuthenticated || isGuest,
    staleTime: 1000 * 60 * 2, // 2 minutes
    meta: {
      onError: (error: any) => {
        console.error('Error fetching state products:', error);
        toast.error("Failed to load state product permissions");
      }
    }
  });

  // Add mutation for saving state permissions
  const savePermissionsMutation = useMutation({
    mutationFn: async ({ stateId, productIds }: { stateId: number, productIds: number[] }): Promise<SavePermissionResult> => {
      console.log(`Saving permissions for state ${stateId} with ${productIds.length} products`);
      
      // First delete existing permissions
      const { error: deleteError } = await supabase
        .from('state_allowed_products')
        .delete()
        .eq('state_id', stateId);
      
      if (deleteError) {
        console.error('Error deleting existing permissions:', deleteError);
        return { success: false, error: deleteError.message };
      }
      
      // Then insert new permissions if there are any
      if (productIds.length > 0) {
        const permissionsToInsert = productIds.map(productId => ({
          state_id: stateId,
          product_id: productId
        }));
        
        const { error: insertError } = await supabase
          .from('state_allowed_products')
          .insert(permissionsToInsert);
        
        if (insertError) {
          console.error('Error inserting new permissions:', insertError);
          return { success: false, error: insertError.message };
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['stateProducts'] });
      toast.success("State permissions saved successfully");
    },
    onError: (error: any) => {
      console.error('Error saving permissions:', error);
      toast.error("Failed to save permissions");
    }
  });

  // Function to fetch products for a specific state - using direct query like the map does
  const fetchProductsForState = async (stateId: number) => {
    try {
      console.log(`Directly fetching products for state ID: ${stateId}`);
      
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select(`
          product_id,
          state_id,
          products (
            id,
            name,
            brand_id,
            brands (
              id, 
              name,
              logo_url
            )
          )
        `)
        .eq('state_id', stateId);
        
      if (error) throw error;
      
      console.log(`Direct state ${stateId} products query returned:`, data?.length || 0, "items");
      console.log("Sample data:", data && data.length > 0 ? data[0] : "No data");
      
      // Transform into the format expected by the application
      return data?.map(item => ({
        id: item.product_id,
        state_id: item.state_id,
        name: item.products?.name || 'Unknown Product',
        brand_id: item.products?.brand_id || 0,
        brand: item.products?.brands || null
      })) || [];
    } catch (error) {
      console.error(`Error fetching products for state ${stateId}:`, error);
      return [];
    }
  };

  // Force refresh all data with an aggressive approach
  const refreshData = async (force = false) => {
    if (force) {
      console.log("Forcing refresh of state products data");
      
      // Clear all cache first
      queryClient.removeQueries({ queryKey: ['stateProducts'] });
      
      // Wait a moment for cache clearing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Force immediate refetch with network-only policy
        await Promise.all([
          queryClient.refetchQueries({ 
            queryKey: ['states'], 
            type: 'all', 
            fetchPolicy: 'network-only' 
          }),
          queryClient.refetchQueries({ 
            queryKey: ['stateProducts'], 
            type: 'all', 
            fetchPolicy: 'network-only' 
          })
        ]);
        
        console.log("State products data successfully refreshed");
        return true;
      } catch (error) {
        console.error("Failed to refresh state products data:", error);
        return false;
      }
    }
    return true;
  };

  // Function to clear cache more aggressively
  const clearCache = async () => {
    console.log("Aggressively clearing state products cache");
    queryClient.removeQueries({ queryKey: ['stateProducts'] });
    queryClient.removeQueries({ queryKey: ['states'] });
    // Add a small delay to ensure cache is cleared before any new queries
    await new Promise(resolve => setTimeout(resolve, 200));
    return true;
  };

  return {
    states: statesQuery.data || [],
    stateProducts: stateProductsQuery.data || [],
    loading: statesQuery.isLoading || stateProductsQuery.isLoading,
    error: statesQuery.error ? 
      String(statesQuery.error) : 
      stateProductsQuery.error ? String(stateProductsQuery.error) : null,
    refreshData,
    clearCache,
    hasInitialized: statesQuery.isFetched && stateProductsQuery.isFetched,
    refreshCounter: statesQuery.dataUpdatedAt + stateProductsQuery.dataUpdatedAt, // Used as a trigger for components
    saveStatePermissions: (stateId: number, productIds: number[]) => 
      savePermissionsMutation.mutateAsync({ stateId, productIds })
        .then(result => result.success),
    fetchProductsForState,
    isSaving: savePermissionsMutation.isPending,
  };
};
