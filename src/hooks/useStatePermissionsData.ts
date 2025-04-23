
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
    if (!isAuthenticated || !isAdmin) {
      setError("Authentication required. Please ensure you're logged in as an admin.");
      setLoading(false);
      return;
    }
    
    try {
      setError(null);
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStates(data || []);
    } catch (error: any) {
      console.error('Error fetching states:', error);
      setError(`Failed to load states: ${error.message}`);
      toast.error("Failed to load states");
    }
  };

  const fetchStateProducts = async () => {
    if (!isAuthenticated || !isAdmin) {
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*');
      
      if (error) throw error;
      setStateProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching state products:', error);
      setError(`Failed to load state product permissions: ${error.message}`);
      toast.error("Failed to load state product permissions");
    }
  };

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchStates(), fetchStateProducts()]);
    setLoading(false);
  };

  useEffect(() => {
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
