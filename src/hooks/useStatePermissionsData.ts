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

  const fetchStates = useCallback(async () => {
    try {
      setError(null);
      console.log("Fetching states data... Auth state:", { isAuthenticated, isAdmin });
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');
      
      if (error) throw error;
      console.log("States data received:", data?.length || 0, "items");
      setStates(data || []);
    } catch (error: any) {
      console.error('Error fetching states:', error);
      setError(`Failed to load states: ${error.message}`);
      toast.error("Failed to load states", {
        description: "Please ensure you're logged in with proper permissions"
      });
    }
  }, [isAuthenticated, isAdmin]);

  const fetchStateProducts = useCallback(async () => {
    try {
      console.log("Fetching state products data...");
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*');
      
      if (error) throw error;
      console.log("State products data received:", data?.length || 0, "items");
      setStateProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching state products:', error);
      setError(`Failed to load state product permissions: ${error.message}`);
      toast.error("Failed to load state product permissions");
    }
  }, []);

  const refreshData = useCallback(async (force = false) => {
    if (!isAuthenticated) {
      console.log("Not authenticated, skipping state permissions data fetch");
      setError("Authentication required. Please ensure you're logged in or continue as guest.");
      setLoading(false);
      return false;
    }
    
    setLoading(true);
    setError(null);
    console.log("Starting state permissions data refresh...");
    
    try {
      await Promise.all([fetchStates(), fetchStateProducts()]);
      console.log("State permissions data refresh complete");
      setRefreshAttempts(0);
      return true;
    } catch (error: any) {
      console.error("Error refreshing data:", error);
      setError(`Failed to refresh data: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchStates, fetchStateProducts, isAuthenticated]);

  // Implement automatic retry logic for initial load
  useEffect(() => {
    const attemptRefresh = async () => {
      console.log(`State permissions data refresh attempt ${refreshAttempts + 1}`);
      
      const success = await refreshData();
      
      if (!success && refreshAttempts < 2) {
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
  }, [isAuthenticated, isAdmin]);

  return {
    states,
    stateProducts,
    loading,
    error,
    refreshData
  };
};
