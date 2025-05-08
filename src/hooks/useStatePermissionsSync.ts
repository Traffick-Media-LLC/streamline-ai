
import { useState, useCallback, useEffect } from 'react';
import { toast } from "@/components/ui/sonner";
import { useErrorHandling } from './useErrorHandling';

export const useStatePermissionsSync = (refreshData: (forceRefresh?: boolean) => Promise<boolean>) => {
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { handleError, errorTracker } = useErrorHandling('StatePermissionsSync');

  // Enhanced refresh function with multiple attempts and proper error handling
  const performRobustRefresh = useCallback(async (forceRefresh = false) => {
    console.log("Performing robust data refresh...");
    setIsRefreshing(true);
    
    await errorTracker.logStage('robust_refresh', 'start', { 
      forceRefresh,
      refreshAttempts 
    });
    
    try {
      const success = await refreshData(forceRefresh);
      
      if (!success && refreshAttempts < 3) {
        console.log(`Refresh attempt ${refreshAttempts + 1} failed, trying again...`);
        setRefreshAttempts(prev => prev + 1);
        
        // Exponential backoff
        const delay = Math.pow(2, refreshAttempts) * 500;
        
        await errorTracker.logStage('robust_refresh', 'progress', { 
          success: false, 
          schedulingRetry: true,
          delay,
          attemptNumber: refreshAttempts + 1 
        });
        
        setTimeout(() => performRobustRefresh(true), delay);
        return false;
      } else if (!success) {
        console.error("Multiple refresh attempts failed");
        
        await errorTracker.logStage('robust_refresh', 'error', { 
          reason: 'max_attempts_reached',
          attempts: refreshAttempts
        });
        
        toast.error("Failed to refresh data after multiple attempts", {
          description: "Please try again later or contact support if the issue persists",
          id: "refresh-failed"
        });
        return false;
      } else {
        console.log("Data refreshed successfully");
        
        await errorTracker.logStage('robust_refresh', 'complete', {
          attempts: refreshAttempts
        });
        
        setRefreshAttempts(0);
        return true;
      }
    } catch (error) {
      await handleError(error, 'robust refresh operation');
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshData, refreshAttempts, errorTracker, handleError]);

  // Auto-reset refresh attempts after successful refresh
  useEffect(() => {
    if (refreshAttempts > 0 && !isRefreshing) {
      const resetTimer = setTimeout(() => {
        setRefreshAttempts(0);
      }, 10000); // Reset attempts after 10 seconds of inactivity
      
      return () => clearTimeout(resetTimer);
    }
  }, [refreshAttempts, isRefreshing]);

  return {
    isRefreshing,
    performRobustRefresh,
    refreshAttempts
  };
};
