
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { 
  LogSeverity, 
  LogCategory, 
  EventLog, 
  ErrorLog,
  StageLog,
  StageStatus,
  LoggerContext
} from "@/types/logging";
import { formatErrorForLogging } from "./errorUtils";
import { generateRequestId } from "./idUtils";
import { calculateDuration, startTimer } from "./timeUtils";

/**
 * Log a chat event to the database and console with enhanced details
 */
export const logEvent = async (log: EventLog): Promise<void> => {
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
          log.metadata || {});
        break;
      case 'error':
        console.error(`[ERROR] ${logPrefix}: ${log.message}`, 
          log.metadata || {});
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
      console.error('Database error in logEvent:', dbError);
    }
  } catch (e) {
    console.error('Error in logEvent:', e);
  }
};

/**
 * Enhanced error logging with more detailed error categorization
 * Supports multiple overloaded calling styles for developer convenience
 */
export async function logError(
  context: LoggerContext,
  message: string,
  error: unknown,
  metadata?: Record<string, any>,
  severity?: 'error' | 'critical',
  category?: LogCategory
): Promise<void>;

export async function logError(
  requestId: string,
  component: string,
  message: string,
  error: unknown,
  metadata?: Record<string, any>,
  chatId?: string,
  userId?: string,
  severity?: 'error' | 'critical',
  category?: LogCategory
): Promise<void>;

export async function logError(
  contextOrRequestId: LoggerContext | string,
  messageOrComponent: string,
  errorOrMessage: unknown | string,
  metadataOrError?: Record<string, any> | unknown,
  severityOrMetadata?: 'error' | 'critical' | Record<string, any>,
  categoryOrChatId?: LogCategory | string,
  userId?: string,
  severity?: 'error' | 'critical',
  category?: LogCategory
): Promise<void> {
  try {
    // Handle overloaded function signatures
    let requestId: string;
    let component: string;
    let message: string;
    let error: unknown;
    let metadata: Record<string, any> | undefined;
    let chatId: string | undefined;
    let userIdToUse: string | undefined;
    let severityToUse: 'error' | 'critical' = 'error';
    let categoryToUse: LogCategory = 'generic';

    if (typeof contextOrRequestId === 'object') {
      // First overload: context object
      const context = contextOrRequestId;
      requestId = context.requestId;
      component = context.component;
      message = messageOrComponent;
      error = errorOrMessage;
      metadata = metadataOrError as Record<string, any> | undefined;
      chatId = context.chatId;
      userIdToUse = context.userId;
      severityToUse = severityOrMetadata as 'error' | 'critical' || 'error';
      categoryToUse = categoryOrChatId as LogCategory || 'generic';
    } else {
      // Second overload: individual parameters
      requestId = contextOrRequestId;
      component = messageOrComponent;
      message = errorOrMessage as string;
      error = metadataOrError;
      metadata = severityOrMetadata as Record<string, any> | undefined;
      chatId = categoryOrChatId as string | undefined;
      userIdToUse = userId;
      severityToUse = severity || 'error';
      categoryToUse = category || 'generic';
    }

    // Enhanced error details extraction
    const errorDetails = formatErrorForLogging(error);

    // Add contextual debugging information based on error category
    const enhancedMetadata = {
      ...(metadata || {}),
      timestamp: Date.now(),
      category: categoryToUse,
      // Add context-specific metadata
      ...(categoryToUse === 'network' ? {
        endpoint: metadata?.endpoint || 'unknown',
        method: metadata?.method || 'unknown',
        status: errorDetails?.status || errorDetails?.response?.status
      } : {}),
      ...(categoryToUse === 'credential' ? {
        service: metadata?.service || 'unknown',
        credentialType: metadata?.credentialType || 'unknown'
      } : {})
    };

    await logEvent({
      requestId,
      chatId,
      userId: userIdToUse,
      eventType: 'error',
      component,
      message,
      metadata: enhancedMetadata,
      severity: severityToUse,
      category: categoryToUse,
      errorDetails
    });

    // For critical errors, show a user-facing toast with more details
    if (severityToUse === 'critical') {
      // Create a more descriptive error message based on category
      let userMessage = `Chat error: ${message}`;
      
      switch (categoryToUse) {
        case 'network':
          userMessage = `Network error: ${message}`;
          break;
        case 'credential':
          userMessage = `Authentication error: ${message}`;
          break;
        case 'ai_response':
          userMessage = `AI response error: ${message}`;
          break;
        case 'database':
          userMessage = `Database error: ${message}`;
          break;
      }
      
      toast.error(userMessage, {
        id: `error-${requestId}`, // Ensure duplicate errors don't show multiple toasts
        description: errorDetails.message
      });
    }
  } catch (e) {
    console.error('Error in logError:', e);
  }
}

/**
 * Debug logging function for development environment only
 */
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
    await logEvent({
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

/**
 * Log various stages of an operation with context
 */
export async function logStage(
  context: LoggerContext,
  stage: string,
  status: StageStatus,
  details?: any
): Promise<void>;

export async function logStage(
  requestId: string,
  component: string,
  stage: string,
  status: StageStatus,
  details?: any,
  chatId?: string,
  userId?: string
): Promise<void>;

export async function logStage(
  contextOrRequestId: LoggerContext | string,
  stageOrComponent: string,
  statusOrStage: StageStatus | string,
  detailsOrStatus?: any,
  chatIdOrDetails?: string | any,
  userId?: string,
  additionalDetails?: any
): Promise<void> {
  try {
    // Handle overloaded function signatures
    let requestId: string;
    let component: string;
    let stage: string;
    let status: StageStatus;
    let details: any;
    let chatId: string | undefined;
    let userIdToUse: string | undefined;

    if (typeof contextOrRequestId === 'object') {
      // First overload: context object
      const context = contextOrRequestId;
      requestId = context.requestId;
      component = context.component;
      stage = stageOrComponent;
      status = statusOrStage as StageStatus;
      details = detailsOrStatus;
      chatId = context.chatId;
      userIdToUse = context.userId;
    } else {
      // Second overload: individual parameters
      requestId = contextOrRequestId;
      component = stageOrComponent;
      stage = statusOrStage as string;
      status = detailsOrStatus as StageStatus;
      details = chatIdOrDetails;
      chatId = userId as string | undefined;
      userIdToUse = additionalDetails;
    }

    const eventType = `${stage}_${status}`;
    const severity: LogSeverity = status === 'error' ? 'error' : 
                              status === 'warning' ? 'warning' : 'info';
    
    await logEvent({
      requestId,
      userId: userIdToUse,
      chatId,
      eventType,
      component,
      message: `${stage} ${status}`,
      metadata: details,
      severity
    });
  } catch (e) {
    console.error('Error in logStage:', e);
  }
}
