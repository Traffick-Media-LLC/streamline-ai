
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Loader2 } from "lucide-react";

interface PerformanceContextType {
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
  isPrefetching: boolean;
  prefetchRoute: (path: string) => Promise<void>;
  measurePerformance: (label: string) => void;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const PerformanceProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPageLoading, setPageLoading] = useState(true);
  const [isPrefetching, setIsPrefetching] = useState(false);

  // Basic performance measurement
  const measurePerformance = useCallback((label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡️ Performance [${label}]:`, performance.now().toFixed(2) + 'ms');
    }
  }, []);

  // Prefetch route handler
  const prefetchRoute = useCallback(async (path: string) => {
    setIsPrefetching(true);
    try {
      // Dynamic import for route prefetching
      if (path.includes('map')) {
        await import('../pages/MapPage');
      } else if (path.includes('chat')) {
        await import('../pages/ChatPage');
      } else if (path.includes('profile')) {
        await import('../pages/ProfilePage');
      }
    } catch (error) {
      console.error("Failed to prefetch route:", error);
    } finally {
      setIsPrefetching(false);
    }
  }, []);

  // Initial page load effect
  useEffect(() => {
    const startTime = performance.now();
    
    // Mark as loaded when all critical assets are loaded
    const handleLoad = () => {
      setPageLoading(false);
      const loadTime = performance.now() - startTime;
      console.log(`📊 Page fully loaded in ${loadTime.toFixed(2)}ms`);
    };

    // Set a max timeout for loading state
    const timeout = setTimeout(() => {
      setPageLoading(false);
    }, 3000);

    // Wait for window load or timeout
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <PerformanceContext.Provider 
      value={{ 
        isPageLoading, 
        setPageLoading, 
        isPrefetching, 
        prefetchRoute, 
        measurePerformance 
      }}
    >
      {isPageLoading ? (
        <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Streamline AI...</p>
          </div>
        </div>
      ) : children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};
