import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorTracker, generateRequestId } from "@/utils/logging";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  component?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  requestId: string;
  errorTracker: ErrorTracker;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const requestId = generateRequestId();
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      requestId,
      errorTracker: new ErrorTracker(props.component || 'ErrorBoundary', undefined, undefined, requestId)
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Enhanced error logging with categorization
    console.error("Uncaught error:", error, errorInfo);
    
    // Log to our centralized error tracking system
    // Using the method signature that accepts message, error, and metadata
    this.state.errorTracker.logError(
      `Uncaught React error: ${error.message}`, 
      error,
      {
        componentStack: errorInfo.componentStack,
        // Extract additional context that might be helpful
        errorType: error.name,
        errorLocation: error.stack?.split('\n')[1] || 'unknown'
      }
    );
    
    this.setState({ errorInfo });
  }

  public resetError = (): void => {
    const requestId = generateRequestId();
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
      requestId,
      errorTracker: new ErrorTracker(
        this.props.component || 'ErrorBoundary', 
        undefined, 
        undefined, 
        requestId
      )
    });
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 border rounded-md bg-background">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {this.state.error?.message || "An unexpected error occurred"}
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Button onClick={this.resetError} variant="outline">
              Try Again
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Error ID: {this.state.requestId}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
