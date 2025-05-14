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
  const { isAuthenticated, isAdmin } = useAuth();
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch states from the database
  const fetchStates = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      setError(null);
      console.log("Fetching states data... Auth state:", { isAuthenticated, isAdmin });
      
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
  }, [isAuthenticated, isAdmin]);

  // Fetch state products with enhanced logging and cache busting
  const fetchStateProducts = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      console.log("Fetching state products data...");
      
      // Add cache-busting timestamp to ensure fresh data when forced
      const timestamp = Date.now();
      
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact' })
        .abortSignal(abortSignal);
      
      if (error) throw error;
      console.log("State products data received:", data?.length || 0, "items");
      
      // Normalize state products data
      const normalizedData = data?.map(item => ({
        ...item,
        state_id: typeof item.state_id === 'string' ? parseInt(item.state_id, 10) : item.state_id,
        product_id: typeof item.product_id === 'string' ? parseInt(item.product_id, 10) : item.product_id
      })) || [];
      
      console.log("Normalized state products:", normalizedData.length, "items");
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

  // Fetch products for a specific state with improved error handling and direct cache invalidation
  const fetchProductsForState = useCallback(async (stateId: number) => {
    console.log(`Directly fetching products for state ID: ${stateId}`);
    
    try {
      // Add cache-busting parameter
      const cacheBuster = Date.now();
      
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*')
        .eq('state_id', stateId);
        
      if (error) {
        throw error;
      }
      
      console.log(`Direct state ${stateId} products query returned:`, data?.length || 0, "items");
      
      // Normalize state products data
      const normalizedData = data?.map(item => ({
        ...item,
        state_id: typeof item.state_id === 'string' ? parseInt(item.state_id, 10) : item.state_id,
        product_id: typeof item.product_id === 'string' ? parseInt(item.product_id, 10) : item.product_id
      })) || [];
      
      // Update the state products by replacing any existing entries for this state
      setStateProducts(prev => {
        const otherStateProducts = prev.filter(p => p.state_id !== stateId);
        return [...otherStateProducts, ...normalizedData];
      });
      
      return normalizedData;
    } catch (error) {
      console.error(`Error fetching products for state ${stateId}:`, error);
      return null;
    }
  }, []);

  // Refresh data only when explicitly requested
  const refreshData = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      console.log("Not authenticated, skipping state permissions data fetch");
      setError("Authentication required. Please ensure you're logged in or continue as guest.");
      setLoading(false);
      return false;
    }
    
    // Stronger throttling protection - only allow force refreshes to bypass throttling
    const currentTime = Date.now();
    if (!force && lastRefreshTime && (currentTime - lastRefreshTime < 5000)) {
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
    
    const controller = new AbortController();
    const signal = controller.signal;
    
    try {
      setRefreshCounter(prev => prev + 1);
      
      const statesSuccess = await fetchStates(signal);
      
      if (!statesSuccess) {
        setLoading(false);
        return false;
      }
      
      // Short delay to avoid race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const productsSuccess = await fetchStateProducts(signal);
      
      console.log("State permissions data refresh complete:", { statesSuccess, productsSuccess });
      
      setRefreshAttempts(0);
      setLoading(false);
      return statesSuccess && productsSuccess;
    } catch (error: any) {
      console.error("Error refreshing data:", error);
      setError(`Failed to refresh data: ${error.message}`);
      setLoading(false);
      return false;
    }
  }, [fetchStates, fetchStateProducts, isAuthenticated, lastRefreshTime]);

  // Initialize data only once
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const initializeData = async () => {
      if (hasInitialized) {
        return;
      }
      
      if (isAuthenticated) {
        console.log("Authentication state confirmed, initializing data", { isAuthenticated, isAdmin });
        setHasInitialized(true);
        
        abortController = new AbortController();
        await refreshData(true);
      } else {
        console.log("Waiting for authentication state before initializing data");
      }
    };

    initializeData();
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [isAuthenticated, isAdmin, refreshData, hasInitialized]);

  // Only retry on actual errors, not just when data is loading
  useEffect(() => {
    if (!hasInitialized || !isAuthenticated) {
      return;
    }
    
    if (loading || !error || refreshAttempts >= 2) {
      return;
    }
    
    console.log(`State permissions data refresh attempt ${refreshAttempts + 1}`);
    const delay = Math.pow(2, refreshAttempts) * 2000;
    
    const retryTimer = setTimeout(() => {
      setRefreshAttempts(prev => prev + 1);
      refreshData(true);
    }, delay);
    
    return () => clearTimeout(retryTimer);
  }, [error, refreshAttempts, loading, refreshData, hasInitialized, isAuthenticated]);

  return {
    states,
    stateProducts,
    loading,
    error,
    refreshData,
    refreshCounter,
    hasInitialized,
    fetchProductsForState
  };
};
