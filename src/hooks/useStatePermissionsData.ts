
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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

  const fetchStates = async () => {
    try {
      const { data, error } = await supabase
        .from('states')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setStates(data || []);
    } catch (error) {
      console.error('Error fetching states:', error);
      toast.error("Failed to load states");
    }
  };

  const fetchStateProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('state_allowed_products')
        .select('*');
      
      if (error) throw error;
      setStateProducts(data || []);
    } catch (error) {
      console.error('Error fetching state products:', error);
      toast.error("Failed to load state product permissions");
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchStates(), fetchStateProducts()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  return {
    states,
    stateProducts,
    loading,
    refreshData
  };
};
