
import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";

export const useStatePermissionsSync = (refreshData: (forceRefresh?: boolean) => Promise<boolean>) => {
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = useState<number | null>(null);

  // Enhanced refresh function with multiple attempts and proper error handling
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
      setLastRefreshTimestamp(currentTime);
      const success = await refreshData(forceRefresh);
      
      if (!success) {
        console.warn(`Refresh attempt ${refreshAttempts + 1} failed`);
        
        if (refreshAttempts < 2) {
          console.log("Scheduling another refresh attempt");
          setRefreshAttempts(prev => prev + 1);
          
          // Exponential backoff
          const delay = Math.pow(2, refreshAttempts) * 1000;
          setTimeout(() => performRobustRefresh(true), delay);
          return false;
        } else {
          console.error("Multiple refresh attempts failed");
          if (forceRefresh) {
            toast.error("Failed to refresh data after multiple attempts");
          }
          return false;
        }
      } else {
        console.log("Data refreshed successfully");
        setRefreshAttempts(0);
        return true;
      }
    } catch (error) {
      console.error("Error during refresh:", error);
      toast.error("Error refreshing data");
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, refreshAttempts, lastRefreshTimestamp]);

  // Reset refresh attempts when the component mounts
  useEffect(() => {
    setRefreshAttempts(0);
  }, []);

  return {
    isRefreshing,
    performRobustRefresh,
    refreshAttempts
  };
};
