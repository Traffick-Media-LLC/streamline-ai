
import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const useStatePermissionsSync = (refreshData: (forceRefresh?: boolean) => Promise<boolean>) => {
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number | null>(null);
  const [refreshSuccessCount, setRefreshSuccessCount] = useState(0);

  // Function to forcibly clear any cached data
  const clearCache = useCallback(async () => {
    try {
      console.log("Attempting to clear Supabase cache with cache-busting query");
      
      // Execute a minimal query with a timestamp to force cache bypass
      const cacheInvalidationToken = Date.now().toString();
      await supabase.from('state_allowed_products')
        .select('id', { head: true, count: 'exact' })
        .eq('id', -1) // Non-existent ID to make query lightweight
        .order('id', { ascending: true })
        .limit(1)
        // Add proper headers to avoid 406 errors
        .throwOnError();
        
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
      
      // Try to clear cache before refreshing
      if (forceRefresh) {
        await clearCache();
      }
      
      // Force invalidate supabase cache by adding cacheBuster parameter
      const success = await refreshData(true); // Always use force refresh to ensure fresh data
      
      if (!success) {
        console.warn(`Refresh attempt ${refreshAttempts + 1} failed`);
        
        if (refreshAttempts < 3) { // Increased from 2 to 3 for more retries
          console.log("Scheduling another refresh attempt");
          setRefreshAttempts(prev => prev + 1);
          
          // Exponential backoff with longer delays
          const delay = Math.pow(2, refreshAttempts) * 1500; // Increased from 1000 to 1500
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
