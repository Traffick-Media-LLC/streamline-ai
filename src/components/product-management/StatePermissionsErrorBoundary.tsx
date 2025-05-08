
import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface StatePermissionsErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  component?: string;
}

const StatePermissionsErrorFallback = ({ 
  error, 
  resetErrorBoundary,
  requestId,
  onRetry 
}: { 
  error: Error; 
  resetErrorBoundary: () => void;
  requestId: string;
  onRetry?: () => void;
}) => {
  const handleRetry = () => {
    resetErrorBoundary();
    onRetry?.();
  };

  return (
    <Card className="border-destructive">
      <CardHeader className="bg-destructive/10">
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          State Permissions Error
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <p className="mb-2 font-semibold">{error.message || "An unexpected error occurred"}</p>
        <p className="text-sm text-muted-foreground mb-4">
          There was a problem with the state permissions module. You can try refreshing the data or contact support if the issue persists.
        </p>
        <div className="p-3 bg-muted rounded-md text-xs font-mono overflow-auto max-h-32">
          {error.stack?.split('\n').slice(0, 3).join('\n')}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Error ID: {requestId}
        </p>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </Button>
          <Button 
            onClick={handleRetry}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export const StatePermissionsErrorBoundary: React.FC<StatePermissionsErrorBoundaryProps> = ({ 
  children,
  onRetry,
  component = 'StatePermissions'
}) => {
  // Create a fallback element using the StatePermissionsErrorFallback component
  const renderFallback = React.useCallback(({ error, resetErrorBoundary, requestId }: { 
    error: Error; 
    resetErrorBoundary: () => void;
    requestId: string;
  }) => (
    <StatePermissionsErrorFallback
      error={error}
      resetErrorBoundary={resetErrorBoundary}
      requestId={requestId}
      onRetry={onRetry}
    />
  ), [onRetry]);

  return (
    <ErrorBoundary
      component={component}
      fallback={renderFallback}
    >
      {children}
    </ErrorBoundary>
  );
};
