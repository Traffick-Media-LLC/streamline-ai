
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

interface State {
  id: number;
  name: string;
}

interface StateProduct {
  id: number;
  state_id: number;
  product_id: number;
}

export const useStatePermissionsData = () => {
  const [states, setStates] = useState<State[]>([]);
  const [stateProducts, setStateProducts] = useState<StateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isAdmin } = useAuth();

  const fetchStates = async () => {
    try {
      setError(null);
      console.log("Fetching states data...");
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
      toast.error("Failed to load states");
    }
  };

  const fetchStateProducts = async () => {
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
  };

  const refreshData = async () => {
    if (!isAuthenticated || !isAdmin) {
      console.log("Not authenticated or not admin, skipping state permissions data fetch");
      setError("Authentication required. Please ensure you're logged in as an admin.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    console.log("Starting state permissions data refresh...");
    await Promise.all([fetchStates(), fetchStateProducts()]);
    setLoading(false);
    console.log("State permissions data refresh complete");
  };

  useEffect(() => {
    console.log("useStatePermissionsData hook initialized, auth state:", { isAuthenticated, isAdmin });
    refreshData();
  }, [isAuthenticated, isAdmin]);

  return {
    states,
    stateProducts,
    loading,
    error,
    refreshData
  };
};
