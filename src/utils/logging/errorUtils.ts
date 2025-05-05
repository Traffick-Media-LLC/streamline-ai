
import { AppError, DatabaseError, NetworkError, ErrorSerializerOptions } from '@/types/logging';

/**
 * Checks if a value is an Error object
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error || 
    (typeof value === 'object' && 
    value !== null && 
    'message' in value &&
    'name' in value);
}

/**
 * Checks if a value is a network error
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return isError(error) && 
    ('status' in error || 
    (error.cause && typeof error.cause === 'object' && error.cause !== null && 'status' in error.cause));
}

/**
 * Checks if a value is a database error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return isError(error) && 
    'code' in error && 
    typeof error.code === 'string' &&
    (error.code.startsWith('22') || error.code.startsWith('23'));
}

/**
 * Formats an error for logging, with configurable options
 */
export function formatErrorForLogging(
  error: unknown, 
  options: ErrorSerializerOptions = {}
): Record<string, any> {
  const { includeStack = process.env.NODE_ENV === 'development', maxDepth = 3, filterSensitive = true } = options;
  
  if (!error) return { message: 'Unknown error' };
  
  // Start with basic error properties
  const errorInfo: Record<string, any> = {};
  
  if (isError(error)) {
    errorInfo.message = error.message || 'Unknown error';
    errorInfo.name = error.name;
    
    if (includeStack && error.stack) {
      errorInfo.stack = error.stack;
    }
    
    // Add AppError properties
    if ('code' in error) errorInfo.code = error.code;
    if ('status' in error) errorInfo.status = error.status;
    if ('metadata' in error && typeof error.metadata === 'object') {
      errorInfo.metadata = error.metadata;
    }
    
    // Handle network errors
    if (isNetworkError(error)) {
      if (error.response) {
        errorInfo.response = {
          status: error.response.status,
          statusText: error.response.statusText
        };
        
        // Only include response data if not sensitive
        if (!filterSensitive && error.response.data) {
          errorInfo.response.data = error.response.data;
        }
      }
    }
    
    // Handle database errors
    if (isDatabaseError(error)) {
      errorInfo.dbError = {
        code: error.code,
        detail: error.detail,
        table: filterSensitive ? undefined : error.table,
        column: error.column
      };
    }
    
    // Handle Supabase errors
    if ('error' in error && error.error) {
      errorInfo.supabaseError = typeof error.error === 'string' 
        ? error.error 
        : (typeof error.error === 'object' && error.error !== null && 'message' in error.error)
          ? error.error.message
          : JSON.stringify(error.error);
    }
  } else if (typeof error === 'object' && error !== null) {
    // Handle non-Error objects
    try {
      errorInfo.data = JSON.stringify(error);
      errorInfo.type = Object.prototype.toString.call(error);
    } catch (e) {
      errorInfo.data = '[Circular object]';
    }
  } else {
    // Handle primitive values
    errorInfo.data = String(error);
    errorInfo.type = typeof error;
  }
  
  return errorInfo;
}

/**
 * Creates a standardized error event name
 */
export function createErrorEventName(
  operation: string,
  subComponent?: string
): string {
  return subComponent 
    ? `${operation}_${subComponent}_error` 
    : `${operation}_error`;
}

/**
 * Creates an AppError from any error type
 */
export function createAppError(
  message: string,
  originalError?: unknown,
  metadata?: Record<string, any>
): AppError {
  const appError = new Error(message) as AppError;
  
  if (originalError) {
    appError.cause = originalError;
    
    if (isError(originalError)) {
      appError.stack = originalError.stack;
      
      if ('code' in originalError) {
        appError.code = originalError.code as string;
      }
      
      if ('status' in originalError) {
        appError.status = originalError.status as number;
      }
    }
  }
  
  if (metadata) {
    appError.metadata = metadata;
  }
  
  return appError;
}
