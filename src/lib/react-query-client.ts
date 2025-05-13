
import { QueryClient } from '@tanstack/react-query';

// Create a client with better stale time and retry logic for admin operations
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: import.meta.env.PROD, // Only in production
    },
  },
});

// Utility function to invalidate product-related queries
export const invalidateProductQueries = () => {
  console.log("Invalidating all product-related queries");
  
  // First remove queries to force a complete refresh
  queryClient.removeQueries({ queryKey: ['stateProducts'] });
  queryClient.removeQueries({ queryKey: ['products'] });
  queryClient.removeQueries({ queryKey: ['brands'] });
  
  // Then refetch them
  return Promise.all([
    queryClient.refetchQueries({ queryKey: ['products'], type: 'all' }),
    queryClient.refetchQueries({ queryKey: ['stateProducts'], type: 'all' }),
    queryClient.refetchQueries({ queryKey: ['brands'], type: 'all' })
  ]);
};

// Utility function for force reset all cache
export const resetAllProductQueries = async () => {
  console.log("Resetting all product-related query cache");
  queryClient.removeQueries({ queryKey: ['stateProducts'] });
  queryClient.removeQueries({ queryKey: ['products'] });
  queryClient.removeQueries({ queryKey: ['brands'] });
  
  // Add a small delay to ensure cache is cleared
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return true;
};
