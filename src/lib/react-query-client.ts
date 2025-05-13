
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
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['stateProducts'] }),
    queryClient.invalidateQueries({ queryKey: ['brands'] })
  ]);
};
