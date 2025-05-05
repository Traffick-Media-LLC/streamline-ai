
import { 
  LoggerContext, 
  StageStatus, 
  LogCategory 
} from "@/types/logging";
import { logError, logStage } from "./logger";
import { generateRequestId } from "./idUtils";
import { startTimer, calculateDuration } from "./timeUtils";

/**
 * Create an error tracker to follow sequences of related errors
 */
export class ErrorTracker {
  private context: LoggerContext;
  private timer: number;
  
  /**
   * Creates a new ErrorTracker instance
   * @param component The component name this tracker is for
   * @param userId Optional user ID for context
   * @param chatId Optional chat ID for context
   * @param requestId Custom request ID, or auto-generated if not provided
   */
  constructor(component: string, userId?: string, chatId?: string, requestId?: string) {
    this.context = {
      requestId: requestId || generateRequestId(),
      component,
      userId,
      chatId
    };
    this.timer = startTimer();
  }
  
  /**
   * Get the request ID for this tracker
   */
  getRequestId(): string {
    return this.context.requestId;
  }
  
  /**
   * Get the chat ID for this tracker (if set)
   */
  getChatId(): string | undefined {
    return this.context.chatId;
  }
  
  /**
   * Log various stages of an operation with context
   * @param stage The operation stage name
   * @param status The status of the stage
   * @param details Optional details/data for the stage
   */
  async logStage(stage: string, status: StageStatus, details?: any): Promise<void> {
    await logStage(
      this.context,
      stage,
      status,
      details
    );
  }
  
  /**
   * Log a specific error with the tracker context
   * @param message The error message
   * @param error The error object
   * @param metadata Additional contextual data
   * @param severity Error severity level
   * @param category Error category
   */
  async logError(
    message: string,
    error: unknown,
    metadata?: Record<string, any>,
    severity: 'error' | 'critical' = 'error',
    category: LogCategory = 'generic'
  ): Promise<void> {
    await logError(
      this.context,
      message,
      error,
      metadata,
      severity,
      category
    );
  }
  
  /**
   * Get elapsed time since this tracker was created
   */
  getElapsedTime(): number {
    return calculateDuration(this.timer);
  }
  
  /**
   * Reset the internal timer
   */
  resetTimer(): void {
    this.timer = startTimer();
  }
  
  /**
   * Create an extended object with additional context
   * @param additionalContext Extra properties to add to context
   */
  withContext(additionalContext: Partial<LoggerContext>): ErrorTracker {
    const newTracker = new ErrorTracker(
      this.context.component,
      this.context.userId,
      this.context.chatId,
      this.context.requestId
    );
    
    Object.assign(newTracker.context, additionalContext);
    return newTracker;
  }
}
