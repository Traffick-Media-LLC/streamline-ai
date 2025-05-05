
// Re-export all logging utilities
export * from './ErrorTracker';
export * from './logger';
export * from './errorUtils';
export * from './timeUtils';
export * from './idUtils';

// Export default helpers for common operations
import { generateRequestId } from './idUtils';
import { ErrorTracker } from './ErrorTracker';
import { logEvent, logError } from './logger';

// Export common functions directly
export {
  generateRequestId,
  ErrorTracker,
  logError,
  logEvent
};

// Create a singleton instance for simple global usage
export const globalErrorTracker = new ErrorTracker('Global');
