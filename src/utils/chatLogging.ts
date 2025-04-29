
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

// Log a chat event to the database and console
export const logChatEvent = async (log: ChatLog): Promise<void> => {
  try {
    // Always log to console for immediate visibility
    const logLevel = log.severity || 'info';
    const timestamp = log.timestamp || Date.now();
    const formattedTime = new Date(timestamp).toISOString();
    
    // Format console output based on severity
    switch(logLevel) {
      case 'critical':
        console.error(`[CRITICAL] [${formattedTime}] [${log.component}] [${log.requestId}]: ${log.message}`, 
          log.metadata || {}, log.errorDetails || {});
        break;
      case 'error':
        console.error(`[ERROR] [${formattedTime}] [${log.component}] [${log.requestId}]: ${log.message}`, 
          log.metadata || {}, log.errorDetails || {});
        break;
      case 'warning':
        console.warn(`[WARNING] [${formattedTime}] [${log.component}] [${log.requestId}]: ${log.message}`, 
          log.metadata || {});
        break;
      default:
        console.log(`[INFO] [${formattedTime}] [${log.component}] [${log.requestId}]: ${log.message}`, 
          log.metadata || {});
    }

    // Store log in database
    const { error } = await supabase
      .from('chat_logs')
      .insert({
        request_id: log.requestId,
        user_id: log.userId,
        chat_id: log.chatId,
        event_type: log.eventType,
        component: log.component,
        message: log.message,
        duration_ms: log.durationMs,
        metadata: log.metadata || {},
        error_details: log.errorDetails || {},
        severity: log.severity || 'info',
        timestamp: new Date(timestamp).toISOString()
      });

    if (error) {
      console.error('Failed to store chat log:', error);
    }
  } catch (e) {
    console.error('Error in logChatEvent:', e);
  }
};

// Helper for logging errors with consistent formatting
export const logChatError = async (
  requestId: string,
  component: string,
  message: string,
  error: any,
  metadata?: Record<string, any>,
  chatId?: string,
  userId?: string,
  severity: 'error' | 'critical' = 'error'
): Promise<void> => {
  const errorDetails = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    name: error?.name,
    code: error?.code
  };

  await logChatEvent({
    requestId,
    chatId,
    userId,
    eventType: 'error',
    component,
    message,
    errorDetails,
    metadata,
    severity
  });

  // For critical errors, show a user-facing toast
  if (severity === 'critical') {
    toast.error(`Chat error: ${message}`);
  }
};
