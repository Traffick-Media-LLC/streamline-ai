
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
    onError: (error: any) => {
      console.error('Error fetching states:', error);
      toast.error("Failed to load states data");
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
    onError: (error: any) => {
      console.error('Error fetching state products:', error);
      toast.error("Failed to load state product permissions");
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

  // Function to fetch products for a specific state
  const fetchProductsForState = async (stateId: number) => {
    try {
      console.log(`Directly fetching products for state ID: ${stateId}`);
      
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*')
        .eq('state_id', stateId);
        
      if (error) throw error;
      
      console.log(`Direct state ${stateId} products query returned:`, data?.length || 0, "items");
      
      // Normalize state products data
      return data?.map(item => ({
        ...item,
        state_id: typeof item.state_id === 'string' ? parseInt(item.state_id, 10) : item.state_id,
        product_id: typeof item.product_id === 'string' ? parseInt(item.product_id, 10) : item.product_id
      })) || [];
    } catch (error) {
      console.error(`Error fetching products for state ${stateId}:`, error);
      return null;
    }
  };

  // Force refresh all data
  const refreshData = async (force = false) => {
    if (force) {
      // Force immediate refetch of both queries
      const [statesResult, productsResult] = await Promise.all([
        queryClient.refetchQueries({ queryKey: ['states'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['stateProducts'], type: 'active' })
      ]);
      
      return statesResult.some(result => result.isSuccess) && 
             productsResult.some(result => result.isSuccess);
    }
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
    hasInitialized: statesQuery.isFetched && stateProductsQuery.isFetched,
    refreshCounter: statesQuery.dataUpdatedAt + stateProductsQuery.dataUpdatedAt, // Used as a trigger for components
    saveStatePermissions: (stateId: number, productIds: number[]) => 
      savePermissionsMutation.mutateAsync({ stateId, productIds })
        .then(result => result.success),
    fetchProductsForState,
    isSaving: savePermissionsMutation.isPending,
  };
};
