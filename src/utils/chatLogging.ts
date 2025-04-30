
import { supabase } from "@/integrations/supabase/client";
import { ChatLog } from "../types/chat";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/components/ui/sonner";

// Generate a unique request ID for tracking a request through its lifecycle
export const generateRequestId = (): string => {
  return uuidv4();
};

// Start timing for performance measurement
export const startTimer = (): number => {
  return performance.now();
};

// Calculate duration between start time and now
export const calculateDuration = (startTime: number): number => {
  return Math.round(performance.now() - startTime);
};

// Enhanced log category types for better error classification
export type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type LogCategory = 'auth' | 'network' | 'document' | 'ai_response' | 'database' | 'credential' | 'generic';

// Log a chat event to the database and console with enhanced details
export const logChatEvent = async (log: ChatLog): Promise<void> => {
  try {
    // Always log to console for immediate visibility
    const logLevel = log.severity || 'info';
    const timestamp = log.timestamp || Date.now();
    const formattedTime = new Date(timestamp).toISOString();
    const category = log.category || 'generic';
    
    // Format console output based on severity
    const logPrefix = `[${formattedTime}] [${log.component}] [${log.requestId}] [${category}]`;
    
    switch(logLevel) {
      case 'critical':
        console.error(`[CRITICAL] ${logPrefix}: ${log.message}`, 
          log.metadata || {}, log.errorDetails || {});
        break;
      case 'error':
        console.error(`[ERROR] ${logPrefix}: ${log.message}`, 
          log.metadata || {}, log.errorDetails || {});
        break;
      case 'warning':
        console.warn(`[WARNING] ${logPrefix}: ${log.message}`, 
          log.metadata || {});
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[DEBUG] ${logPrefix}: ${log.message}`, 
            log.metadata || {});
        }
        break;
      default:
        console.log(`[INFO] ${logPrefix}: ${log.message}`, 
          log.metadata || {});
    }

    // Store log in database with enhanced categorization
    try {
      const { error } = await supabase
        .from('chat_logs')
        .insert({
          request_id: log.requestId,
          user_id: log.userId,
          chat_id: log.chatId,
          event_type: log.eventType,
          component: log.component,
          category: category,
          message: log.message,
          duration_ms: log.durationMs,
          metadata: log.metadata || {},
          error_details: log.errorDetails || {},
          severity: log.severity || 'info',
          timestamp: new Date(timestamp).toISOString(),
          client_info: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
          }
        });

      if (error) {
        console.error('Failed to store chat log:', error);
      }
    } catch (dbError) {
      console.error('Database error in logChatEvent:', dbError);
    }
  } catch (e) {
    console.error('Error in logChatEvent:', e);
  }
};

// Enhanced error logging with more detailed error categorization
export const logChatError = async (
  requestId: string,
  component: string,
  message: string,
  error: any,
  metadata?: Record<string, any>,
  chatId?: string,
  userId?: string,
  severity: 'error' | 'critical' = 'error',
  category: LogCategory = 'generic'
): Promise<void> => {
  try {
    // Enhanced error details extraction
    const errorDetails = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      status: error?.status,
      statusText: error?.statusText,
      response: error?.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined,
      // Extract any Edge Function error details
      edgeFunctionError: error?.error?.error || error?.error || undefined,
    };

    // Add contextual debugging information based on error category
    const enhancedMetadata = {
      ...(metadata || {}),
      timestamp: Date.now(),
      category,
      // Add context-specific metadata
      ...(category === 'network' ? {
        endpoint: metadata?.endpoint || 'unknown',
        method: metadata?.method || 'unknown',
        status: error?.status || error?.response?.status
      } : {}),
      ...(category === 'document' ? {
        documentIds: metadata?.documentIds || [],
        operation: metadata?.operation || 'unknown'
      } : {}),
      ...(category === 'credential' ? {
        service: metadata?.service || 'unknown',
        credentialType: metadata?.credentialType || 'unknown'
      } : {})
    };

    await logChatEvent({
      requestId,
      chatId,
      userId,
      eventType: 'error',
      component,
      message,
      errorDetails,
      metadata: enhancedMetadata,
      severity,
      category
    });

    // For critical errors, show a user-facing toast with more details
    if (severity === 'critical') {
      // Create a more descriptive error message based on category
      let userMessage = `Chat error: ${message}`;
      
      switch (category) {
        case 'network':
          userMessage = `Network error: ${message}`;
          break;
        case 'document':
          userMessage = `Document error: ${message}`;
          break;
        case 'credential':
          userMessage = `Authentication error: ${message}`;
          break;
        case 'ai_response':
          userMessage = `AI response error: ${message}`;
          break;
      }
      
      toast.error(userMessage, {
        id: `error-${requestId}`, // Ensure duplicate errors don't show multiple toasts
        description: errorDetails.message
      });
    }
  } catch (e) {
    console.error('Error in logChatError:', e);
  }
};

// Debug logging function for development environment only
export const logDebug = async (
  requestId: string,
  component: string,
  message: string,
  data?: any,
  chatId?: string,
  userId?: string
): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') return;
  
  try {
    await logChatEvent({
      requestId,
      chatId,
      userId,
      eventType: 'debug',
      component,
      message,
      metadata: data,
      severity: 'debug'
    });
  } catch (e) {
    console.debug('Error in debug logging:', e);
  }
};

// Create an error tracker to follow sequences of related errors
export class ErrorTracker {
  private requestId: string;
  private component: string;
  private userId?: string;
  private chatId?: string;
  
  constructor(requestId: string, component: string, userId?: string, chatId?: string) {
    this.requestId = requestId;
    this.component = component;
    this.userId = userId;
    this.chatId = chatId;
  }
  
  // Log various stages of an operation with context
  async logStage(stage: string, status: 'start' | 'complete' | 'error', details?: any): Promise<void> {
    const eventType = `${stage}_${status}`;
    const severity = status === 'error' ? 'error' : 'info';
    
    await logChatEvent({
      requestId: this.requestId,
      userId: this.userId,
      chatId: this.chatId,
      eventType,
      component: this.component,
      message: `${stage} ${status}`,
      metadata: details,
      severity: severity as LogSeverity
    });
  }
  
  // Log a specific error with the tracker context
  async logError(
    message: string,
    error: any,
    metadata?: Record<string, any>,
    severity: 'error' | 'critical' = 'error',
    category: LogCategory = 'generic'
  ): Promise<void> {
    await logChatError(
      this.requestId,
      this.component,
      message,
      error,
      metadata,
      this.chatId,
      this.userId,
      severity,
      category
    );
  }
  
  // Getter method for chatId to fix TypeScript error in useChatSending.ts
  getChatId(): string | undefined {
    return this.chatId;
  }
}

// Function to format error info for logging
export const formatErrorForLogging = (error: any): Record<string, any> => {
  if (!error) return { message: 'Unknown error' };
  
  // Start with basic error properties
  const errorInfo: Record<string, any> = {
    message: error.message || 'Unknown error',
    name: error.name,
    code: error.code
  };
  
  // Add stack trace in development only
  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorInfo.stack = error.stack;
  }
  
  // Add response data if available (for fetch/axios errors)
  if (error.response) {
    errorInfo.response = {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data
    };
  }
  
  // Add Supabase-specific error details if present
  if (error.error) {
    errorInfo.supabaseError = error.error.message || error.error;
  }
  
  return errorInfo;
};

// Utility to create a standardized error event name
export const createErrorEventName = (
  operation: string,
  subComponent?: string
): string => {
  return subComponent 
    ? `${operation}_${subComponent}_error` 
    : `${operation}_error`;
};
