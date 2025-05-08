
import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { State, StateProduct } from '@/types/statePermissions';
import { useErrorHandling } from './useErrorHandling';

export const useStatePermissionsData = () => {
  const [states, setStates] = useState<State[]>([]);
  const [stateProducts, setStateProducts] = useState<StateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const { isAuthenticated, isAdmin } = useAuth();
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  
  const { 
    error, 
    isError, 
    handleError, 
    clearError, 
    attemptRecovery, 
    errorTracker 
  } = useErrorHandling('StatePermissionsData');

  const fetchStates = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      clearError();
      console.log("Fetching states data... Auth state:", { isAuthenticated, isAdmin });
      
      // Generate a cache-busting query param
      const cacheBuster = `cache_bust=${Date.now()}`;
      
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
      
      const { isAuthError } = await handleError(error, 'fetching states', { 
        authState: { isAuthenticated, isAdmin } 
      });
      
      if (isAuthError) {
        // Special handling for auth errors
        console.log("Auth error detected during states fetch");
      }
      
      return false;
    }
  }, [isAuthenticated, isAdmin, clearError, handleError]);

  const fetchStateProducts = useCallback(async (abortSignal?: AbortSignal) => {
    try {
      console.log("Fetching state products data...");
      
      // Generate a cache-busting query param
      const cacheBuster = `cache_bust=${Date.now()}`;
      
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*', { count: 'exact' })
        .abortSignal(abortSignal);
      
      if (error) throw error;
      console.log("State products data received:", data?.length || 0, "items");
      setStateProducts(data || []);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('State products fetch aborted');
        return false;
      }
      
      await handleError(error, 'fetching state products');
      return false;
    }
  }, [handleError]);

  const refreshData = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      console.log("Not authenticated, skipping state permissions data fetch");
      await handleError(
        new Error("Authentication required"), 
        'data refresh', 
        { isAuthenticated }
      );
      setLoading(false);
      return false;
    }
    
    const currentTime = Date.now();
    // Skip refresh if not forced and we've refreshed in the last 500ms
    if (!force && lastRefreshTime && currentTime - lastRefreshTime < 500) {
      console.log("Skipping refresh due to throttling", {
        lastRefresh: new Date(lastRefreshTime).toISOString(),
        timeSinceLast: currentTime - lastRefreshTime
      });
      return true;
    }
    
    setLoading(true);
    clearError();
    console.log("Starting state permissions data refresh...");
    
    await errorTracker.logStage('data_refresh', 'start', {
      force,
      refreshAttempts,
      lastRefreshTime
    });
    
    // Create an AbortController for each fetch operation
    const controller = new AbortController();
    const signal = controller.signal;
    
    try {
      // Set last refresh time immediately to prevent duplicate calls
      setLastRefreshTime(currentTime);
      
      // Use Promise.all to fetch data in parallel
      const [statesSuccess, productsSuccess] = await Promise.all([
        fetchStates(signal), 
        fetchStateProducts(signal)
      ]);
      
      const success = statesSuccess && productsSuccess;
      
      await errorTracker.logStage('data_refresh', 
        success ? 'complete' : 'error',
        { success, statesSuccess, productsSuccess }
      );
      
      console.log("State permissions data refresh complete", { success });
      
      if (success) {
        setRefreshAttempts(0);
      }
      
      return success;
    } catch (error: any) {
      await handleError(error, 'refreshing data');
      return false;
    } finally {
      setLoading(false);
    }
  }, [
    fetchStates, 
    fetchStateProducts, 
    isAuthenticated, 
    lastRefreshTime,
    clearError,
    handleError,
    errorTracker,
    refreshAttempts
  ]);

  // Implement automatic retry logic for initial load
  useEffect(() => {
    let isMounted = true;
    let abortController: AbortController | null = null;
    
    const attemptRefresh = async () => {
      if (!isMounted) return;
      
      console.log(`State permissions data refresh attempt ${refreshAttempts + 1}`);
      
      // Create new AbortController for this attempt
      abortController = new AbortController();
      
      const success = await refreshData();
      
      if (!success && refreshAttempts < 2 && isMounted) {
        // Increment attempts and try again with exponential backoff
        setRefreshAttempts(prev => prev + 1);
        const delay = Math.pow(2, refreshAttempts) * 1000; // 1s, 2s, 4s backoff
        console.log(`Scheduling retry in ${delay}ms`);
        setTimeout(attemptRefresh, delay);
      }
    };
    
    if (isAuthenticated || isAdmin) {
      attemptRefresh();
    } else {
      console.log("Waiting for authentication state before loading data");
    }
    
    return () => {
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [isAuthenticated, isAdmin, refreshAttempts, refreshData]);

  // Add recovery capability
  useEffect(() => {
    if (isError && !loading) {
      // Set up automatic recovery for certain errors
      attemptRecovery(async () => {
        return await refreshData(true);
      });
    }
  }, [isError, loading, attemptRecovery, refreshData]);

  return {
    states,
    stateProducts,
    loading,
    error,
    isError,
    refreshData,
    clearError
  };
};
