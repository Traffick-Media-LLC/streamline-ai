
import { User } from '@supabase/supabase-js';

// Enhanced log severity and category types
export type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
export type LogCategory = 'auth' | 'network' | 'ai_response' | 'database' | 'credential' | 'ui' | 'state' | 'generic';

// Stage status definition
export type StageStatus = 'start' | 'complete' | 'error' | 'warning' | 'progress';

// Base log interface shared by all log types
export interface BaseLog {
  requestId: string;
  userId?: string;
  chatId?: string;
  component: string;
  timestamp?: number;
}

// Basic event log
export interface EventLog extends BaseLog {
  eventType: string;
  message: string;
  metadata?: Record<string, any>;
  severity?: LogSeverity;
  category?: LogCategory;
  durationMs?: number;
  errorDetails?: Record<string, any>; // Added to fix TS2353 error
}

// Error-specific log with enhanced error details
export interface ErrorLog extends BaseLog {
  message: string;
  error: unknown;
  metadata?: Record<string, any>;
  severity: 'error' | 'critical';
  category: LogCategory;
  errorDetails?: Record<string, any>;
}

// Stage operation log
export interface StageLog extends BaseLog {
  stage: string;
  status: StageStatus;
  details?: Record<string, any>;
  durationMs?: number;
}

// Structured error types
export interface AppError extends Error {
  code?: string;
  status?: number;
  cause?: Error | unknown;
  metadata?: Record<string, any>;
}

// Polyfill for Error.cause in older environments 
declare global {
  interface Error {
    cause?: Error | unknown;
  }
}

export interface NetworkError extends AppError {
  status: number;
  response?: {
    data?: any;
    status?: number;
    statusText?: string;
  };
}

export interface DatabaseError extends AppError {
  code: string;
  detail?: string;
  table?: string;
  column?: string;
}

// Logger context interface
export interface LoggerContext {
  requestId: string;
  component: string;
  userId?: string;
  chatId?: string;
  user?: User;
}

// Serializer options
export interface ErrorSerializerOptions {
  includeStack?: boolean;
  maxDepth?: number;
  filterSensitive?: boolean;
}
