
/**
 * Start timing for performance measurement
 */
export const startTimer = (): number => {
  return performance.now();
};

/**
 * Calculate duration between start time and now
 */
export const calculateDuration = (startTime: number): number => {
  return Math.round(performance.now() - startTime);
};

/**
 * Creates a simple timing utility for measuring operation durations
 */
export function createTimer() {
  const start = startTimer();
  
  return {
    /**
     * Get elapsed time since timer started
     */
    elapsed: (): number => calculateDuration(start),
    
    /**
     * Reset the timer to current time
     */
    reset: (): number => startTimer(),
    
    /**
     * Format elapsed time with units
     */
    format: (): string => {
      const duration = calculateDuration(start);
      return duration < 1000 
        ? `${duration}ms` 
        : `${(duration / 1000).toFixed(2)}s`;
    }
  };
}

/**
 * Creates an async timer that wraps a promise and measures its execution time
 */
export async function timePromise<T>(
  operation: string,
  promise: Promise<T>,
  onComplete?: (operation: string, durationMs: number) => void
): Promise<T> {
  const startTime = startTimer();
  
  try {
    const result = await promise;
    const duration = calculateDuration(startTime);
    
    if (onComplete) {
      onComplete(operation, duration);
    }
    
    return result;
  } catch (error) {
    const duration = calculateDuration(startTime);
    
    if (onComplete) {
      onComplete(`${operation} (failed)`, duration);
    }
    
    throw error;
  }
}
