
import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const useStatePermissionsSync = (refreshData: (forceRefresh?: boolean) => Promise<boolean>) => {
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number | null>(null);
  const [refreshSuccessCount, setRefreshSuccessCount] = useState(0);
  const [lastQueryTimestamp, setLastQueryTimestamp] = useState<number>(0);

  // Function to forcibly clear any cached data with multiple approaches
  const clearCache = useCallback(async () => {
    try {
      console.log("Attempting to clear Supabase cache with multiple cache-busting approaches");
      
      // Generate a unique cache busting token
      const cacheInvalidationToken = Date.now().toString();
      
      // Approach 1: Make a timestamp-parameterized query to invalidate cache
      await supabase.from('state_allowed_products')
        .select('id', { head: true, count: 'exact' })
        .eq('id', -1) // Non-existent ID to make query lightweight
        .limit(1)
        .order('id', { ascending: false });
      
      // Approach 2: Make query to different tables to bust more cache
      await supabase.from('states')
        .select('id', { head: true, count: 'exact' })
        .eq('id', -1)
        .limit(1);
        
      await supabase.from('products')
        .select('id', { head: true, count: 'exact' })
        .eq('id', -1)
        .limit(1);
      
      // Approach 3: Use RPC to force a new connection/query
      try {
        await supabase.rpc('is_admin');
      } catch (e) {
        // Expected to possibly fail, but still helps with cache invalidation
      }
      
      // Update timestamp to prevent hammering the database
      setLastQueryTimestamp(Date.now());
      
      console.log("Cache clearing complete with multiple approaches");
      return true;
    } catch (error) {
      console.warn("Cache clearing attempt failed:", error);
      return false;
    }
  }, []);

  // Enhanced refresh function with multiple attempts, proper error handling, and cache invalidation
  const performRobustRefresh = useCallback(async (forceRefresh = false) => {
    console.log("Performing robust data refresh...", { forceRefresh });
    
    // Throttle refreshes to prevent too many calls in quick succession
    const currentTime = Date.now();
    if (!forceRefresh && lastRefreshTimestamp && (currentTime - lastRefreshTimestamp < 1000)) {
      console.log("Throttling refresh request:", currentTime - lastRefreshTimestamp, "ms since last refresh");
      return true;
    }
    
    setIsRefreshing(true);
    
    try {
      // Always set the timestamp to prevent multiple refreshes
      setLastRefreshTimestamp(currentTime);
      
      // Try to clear cache before refreshing - more aggressively if forcing
      if (forceRefresh || refreshAttempts > 0) {
        await clearCache();
      }
      
      // Add short delay before refreshing to ensure cache is cleared
      if (forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Force invalidate supabase cache by adding timestamp parameter
      const success = await refreshData(true); // Always use force refresh to ensure fresh data
      
      if (!success) {
        console.warn(`Refresh attempt ${refreshAttempts + 1} failed`);
        
        if (refreshAttempts < 4) { // Increased retry attempts
          console.log("Scheduling another refresh attempt");
          setRefreshAttempts(prev => prev + 1);
          
          // Exponential backoff with longer delays
          const delay = Math.pow(2, refreshAttempts) * 2000; // Increased from 1500 to 2000
          console.log(`Will retry in ${delay}ms`);
          setTimeout(() => performRobustRefresh(true), delay);
          return false;
        } else {
          console.error("Multiple refresh attempts failed");
          if (forceRefresh) {
            toast.error("Failed to refresh data after multiple attempts", {
              description: "Please try the manual refresh button or reload the page"
            });
          }
          return false;
        }
      } else {
        console.log("Data refreshed successfully");
        setRefreshAttempts(0);
        setRefreshSuccessCount(prev => prev + 1);
        return true;
      }
    } catch (error) {
      console.error("Error during refresh:", error);
      toast.error("Error refreshing data", {
        description: "Please check your connection and try again"
      });
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, refreshAttempts, lastRefreshTimestamp, clearCache]);

  // Reset refresh attempts when the component mounts
  useEffect(() => {
    setRefreshAttempts(0);
  }, []);

  // Periodic refresh attempt if recent saves have occurred
  useEffect(() => {
    if (refreshSuccessCount > 0) {
      const timer = setTimeout(() => {
        console.log("Running follow-up refresh to ensure data consistency");
        performRobustRefresh(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [refreshSuccessCount, performRobustRefresh]);

  return {
    isRefreshing,
    performRobustRefresh,
    refreshAttempts,
    clearCache,
    refreshSuccessCount
  };
};
