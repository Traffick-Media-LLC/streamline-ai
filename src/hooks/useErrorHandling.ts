
import { useState, useCallback } from 'react';
import { toast } from "@/components/ui/sonner";
import { ErrorTracker } from "@/utils/logging";

interface ErrorState {
  message: string | null;
  code?: string;
  timestamp?: number;
  retryCount: number;
  context?: Record<string, any>;
}

export const useErrorHandling = (component: string) => {
  const [error, setError] = useState<ErrorState | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const errorTracker = new ErrorTracker(component);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback(async (
    err: any,
    operation: string,
    context?: Record<string, any>
  ) => {
    // Extract error details
    const errorMessage = err.message || 'An unknown error occurred';
    const errorCode = err.code || err.status || 'UNKNOWN';
    
    // Categorize the error
    const isNetworkError = errorMessage.includes('network') || 
      errorMessage.includes('connection') || 
      errorMessage.includes('timeout');
    
    const isAuthError = errorCode === '401' || 
      errorCode === '403' || 
      errorMessage.includes('permission') || 
      errorMessage.includes('not allowed') ||
      errorMessage.includes('policy');

    const isDataError = errorCode === '409' || 
      errorCode === '422' || 
      errorMessage.includes('conflict') || 
      errorMessage.includes('already exists');

    // Log the error with proper categorization
    await errorTracker.logError(
      `Error during ${operation}: ${errorMessage}`,
      err,
      { ...context, operation }
    );

    // Update error state
    setError({
      message: errorMessage,
      code: errorCode,
      timestamp: Date.now(),
      retryCount: (error?.retryCount || 0) + 1,
      context
    });

    // Show appropriate toast message based on error type
    if (isNetworkError) {
      toast.error("Network error", {
        description: "Please check your connection and try again",
        id: `network-error-${operation}`
      });
    } else if (isAuthError) {
      toast.error("Authentication error", {
        description: "You don't have permission to perform this action",
        id: `auth-error-${operation}`
      });
    } else if (isDataError) {
      toast.error("Data operation failed", {
        description: errorMessage,
        id: `data-error-${operation}`
      });
    } else {
      toast.error(`Error: ${operation} failed`, {
        description: errorMessage,
        id: `error-${operation}`
      });
    }

    return {
      isNetworkError,
      isAuthError,
      isDataError,
      errorMessage,
      errorCode
    };
  }, [error, errorTracker]);

  const attemptRecovery = useCallback(async (
    recoveryFn: () => Promise<boolean>,
    maxRetries: number = 3
  ) => {
    if (!error || error.retryCount >= maxRetries) {
      return false;
    }

    setIsRecovering(true);
    
    try {
      // Log recovery attempt
      await errorTracker.logStage('error_recovery', 'start', { 
        attemptNumber: error.retryCount,
        maxRetries,
        errorDetails: error
      });
      
      // Exponential backoff
      const delay = Math.pow(2, error.retryCount - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Attempt recovery
      const success = await recoveryFn();
      
      // Log recovery result
      await errorTracker.logStage('error_recovery', 
        success ? 'complete' : 'error',
        { success, attemptNumber: error.retryCount }
      );
      
      if (success) {
        clearError();
        toast.success("Recovered successfully", { id: "recovery-success" });
      }
      
      return success;
    } catch (err) {
      // Log recovery failure
      await errorTracker.logError(
        "Error recovery attempt failed",
        err,
        { attemptNumber: error.retryCount, originalError: error }
      );
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [error, errorTracker, clearError]);

  return {
    error,
    isError: !!error,
    isRecovering,
    clearError,
    handleError,
    attemptRecovery,
    errorTracker
  };
};
