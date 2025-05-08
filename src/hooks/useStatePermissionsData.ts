
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { State, StateProduct } from '@/types/statePermissions';

export const useStatePermissionsData = () => {
  const [states, setStates] = useState<State[]>([]);
  const [stateProducts, setStateProducts] = useState<StateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchStates = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      setError(null);
      console.log("Fetching states data... Auth state:", { isAuthenticated, isAdmin, isGuest });
      
      const { data, error } = await supabase
        .from('states')
        .select('*', { count: 'exact' })
        .order('name')
        .abortSignal(abortSignal);
      
      if (error) throw error;
      console.log("States data received:", data?.length || 0, "items");
      setStates(data || []);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('States fetch aborted');
        return false;
      }
      
      console.error('Error fetching states:', error);
      setError(`Failed to load states: ${error.message}`);
      toast.error("Failed to load states", {
        description: error.message.includes('policy') 
          ? "Admin access required. Please ensure you have proper permissions."
          : error.message
      });
      return false;
    }
  }, [isAuthenticated, isAdmin, isGuest]);

  const fetchStateProducts = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      console.log("Fetching state products data...");
      
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact' })
        .abortSignal(abortSignal);
      
      if (error) throw error;
      console.log("State products data received:", data?.length || 0, "items");
      
      // Convert string IDs to numbers if needed
      const normalizedData = data?.map(item => ({
        ...item,
        state_id: typeof item.state_id === 'string' ? parseInt(item.state_id, 10) : item.state_id,
        product_id: typeof item.product_id === 'string' ? parseInt(item.product_id, 10) : item.product_id
      })) || [];
      
      console.log("Normalized state products:", normalizedData);
      setStateProducts(normalizedData);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('State products fetch aborted');
        return false;
      }
      
      console.error('Error fetching state products:', error);
      setError(`Failed to load state product permissions: ${error.message}`);
      toast.error("Failed to load state product permissions");
      return false;
    }
  }, []);

  // Simplified refresh function with better throttling and single-execution guarantees
  const refreshData = useCallback(async (force = false) => {
    // Skip if not authenticated and not in guest mode
    if (!isAuthenticated && !isGuest) {
      console.log("Not authenticated, skipping state permissions data fetch");
      setError("Authentication required. Please ensure you're logged in or continue as guest.");
      setLoading(false);
      return false;
    }
    
    // Implement better throttling to prevent multiple simultaneous refreshes
    const currentTime = Date.now();
    if (!force && lastRefreshTime && (currentTime - lastRefreshTime < 1000)) {
      console.log("Skipping refresh due to throttling", {
        lastRefresh: new Date(lastRefreshTime).toISOString(),
        timeSinceLast: currentTime - lastRefreshTime
      });
      return true;
    }
    
    // Set last refresh time immediately to prevent duplicate calls
    setLastRefreshTime(currentTime);
    setLoading(true);
    setError(null);
    console.log("Starting state permissions data refresh...");
    
    // Create an AbortController for each fetch operation
    const controller = new AbortController();
    const signal = controller.signal;
    
    try {
      // Increment refresh counter to force re-renders
      setRefreshCounter(prev => prev + 1);
      
      // First clear the state products to avoid stale data
      setStateProducts([]);
      
      // Sequential fetching to prevent race conditions
      const statesSuccess = await fetchStates(signal);
      
      // If states fetch failed, don't attempt to fetch products
      if (!statesSuccess) {
        setLoading(false);
        return false;
      }
      
      // Short delay between requests to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const productsSuccess = await fetchStateProducts(signal);
      
      console.log("State permissions data refresh complete:", {
        statesSuccess,
        productsSuccess
      });
      
      setRefreshAttempts(0);
      setLoading(false);
      return statesSuccess && productsSuccess;
    } catch (error: any) {
      console.error("Error refreshing data:", error);
      setError(`Failed to refresh data: ${error.message}`);
      setLoading(false);
      return false;
    }
  }, [fetchStates, fetchStateProducts, isAuthenticated, isGuest, lastRefreshTime]);

  // Revised initialization logic with proper auth state handling
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const initializeData = async () => {
      // Skip if already initialized
      if (hasInitialized) {
        return;
      }
      
      // Ensure we have auth state before proceeding
      if ((isAuthenticated || isGuest)) {
        console.log("Authentication state confirmed, initializing data", { 
          isAuthenticated, 
          isAdmin, 
          isGuest 
        });
        setHasInitialized(true);
        
        // Create new AbortController for this initialization
        abortController = new AbortController();
        
        await refreshData(true);
      } else {
        console.log("Waiting for authentication state before initializing data");
      }
    };

    // Trigger initialization when auth state is available
    initializeData();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [isAuthenticated, isAdmin, isGuest, refreshData, hasInitialized]);

  // Implement automatic retry logic for initial load with better backoff
  useEffect(() => {
    // Skip if already loaded or no auth state yet
    if (!hasInitialized || !(isAuthenticated || isGuest)) {
      return;
    }
    
    // Skip if loading is in progress
    if (loading) {
      return;
    }
    
    // Only retry on error and limit attempts
    if (error && refreshAttempts < 2) {
      console.log(`State permissions data refresh attempt ${refreshAttempts + 1}`);
      
      // Exponential backoff for retries
      const delay = Math.pow(2, refreshAttempts) * 2000; // 2s, 4s backoff
      
      const retryTimer = setTimeout(() => {
        setRefreshAttempts(prev => prev + 1);
        refreshData(true);
      }, delay);
      
      return () => clearTimeout(retryTimer);
    }
  }, [error, refreshAttempts, loading, refreshData, hasInitialized, isAuthenticated, isGuest]);

  return {
    states,
    stateProducts,
    loading,
    error,
    refreshData,
    refreshCounter, // Expose the counter to force re-renders in dependent components
    hasInitialized
  };
};
