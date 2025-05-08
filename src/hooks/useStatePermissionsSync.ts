
import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";

export const useStatePermissionsSync = (refreshData: (forceRefresh?: boolean) => Promise<boolean>) => {
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Enhanced refresh function with multiple attempts and proper error handling
  const performRobustRefresh = useCallback(async (forceRefresh = false) => {
    console.log("Performing robust data refresh...");
    setIsRefreshing(true);
    
    try {
      const success = await refreshData(forceRefresh);
      
      if (!success && refreshAttempts < 3) {
        console.log(`Refresh attempt ${refreshAttempts + 1} failed, trying again...`);
        setRefreshAttempts(prev => prev + 1);
        
        // Exponential backoff
        const delay = Math.pow(2, refreshAttempts) * 500;
        setTimeout(() => performRobustRefresh(true), delay);
        return false;
      } else if (!success) {
        console.error("Multiple refresh attempts failed");
        toast.error("Failed to refresh data after multiple attempts");
        return false;
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
  }, [refreshData, refreshAttempts]);

  return {
    isRefreshing,
    performRobustRefresh,
    refreshAttempts
  };
};
