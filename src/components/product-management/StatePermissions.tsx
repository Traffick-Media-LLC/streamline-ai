
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, MapPin, List, Loader2, Bug } from "lucide-react";
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import { StatePermissionsList } from "./StatePermissionsList";
import { StatePermissionsMap } from "./StatePermissionsMap";
import { useStatePermissionsManager } from "@/hooks/useStatePermissionsManager";
import { StatePermissionsProps } from '@/types/statePermissions';
import { useAuth } from "@/contexts/AuthContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

const StatePermissions: React.FC<StatePermissionsProps> = () => {
  const {
    states,
    products,
    brands,
    selectedState,
    selectedProducts,
    setSelectedProducts,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    isDialogOpen,
    setIsDialogOpen,
    loading,
    error,
    isSaving,
    handleStateClick,
    handleSavePermissions,
    getStateProducts,
    handleEditState,
    refreshData,
    hasChanges,
    debugLogs
  } = useStatePermissionsManager();

  const { isAuthenticated, isAdmin } = useAuth();
  const [showDebug, setShowDebug] = useState(false);

  // Show auth status for debugging
  React.useEffect(() => {
    console.log("StatePermissions component - Auth status:", { isAuthenticated, isAdmin });
  }, [isAuthenticated, isAdmin]);

  // Show appropriate loading or error states
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            This page requires admin access. Please ensure you're logged in with appropriate permissions.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => window.location.href = '/auth'} 
          className="mt-4 flex items-center gap-2"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={refreshData} className="mt-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Manage State Permissions</h2>
        <div className="flex gap-4">
          <Button 
            variant={viewMode === 'map' ? 'default' : 'outline'} 
            onClick={() => setViewMode('map')}
            disabled={loading}
          >
            <MapPin className="mr-2 h-4 w-4" />
            Map View
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            onClick={() => setViewMode('list')}
            disabled={loading}
          >
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
          <Button 
            variant="outline"
            onClick={refreshData}
            disabled={loading}
            className="ml-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-2"
            onClick={() => setShowDebug(!showDebug)}
            title="Toggle Debug Panel"
          >
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showDebug && (
        <Collapsible className="mb-6 border rounded-md p-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer p-2">
              <h3 className="text-sm font-semibold flex items-center">
                <Bug className="h-4 w-4 mr-2" /> Debug Information
              </h3>
              <span className="text-xs text-muted-foreground">
                {debugLogs?.length || 0} entries
              </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 p-2 text-xs font-mono">
                {debugLogs?.length ? (
                  debugLogs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`p-2 rounded ${
                        log.level === 'error' ? 'bg-red-50 text-red-800' : 
                        log.level === 'warning' ? 'bg-yellow-50 text-yellow-800' : 
                        log.level === 'success' ? 'bg-green-50 text-green-800' : 
                        'bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between">
                        <span className="font-bold">[{log.level.toUpperCase()}]</span>
                        <span>{new Date().toISOString()}</span>
                      </div>
                      <div className="mt-1">{log.message}</div>
                      {log.data && (
                        <div className="mt-1 overflow-x-auto">
                          <pre>{JSON.stringify(log.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-center text-muted-foreground">No logs available</div>
                )}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center my-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading permission data...</p>
        </div>
      ) : viewMode === 'map' ? (
        <StatePermissionsMap onStateClick={handleStateClick} />
      ) : (
        <StatePermissionsList
          states={states}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          getStateProducts={getStateProducts}
          onEditState={handleEditState}
        />
      )}

      <ProductSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        products={products}
        brands={brands}
        selectedProducts={selectedProducts}
        onSelectionChange={setSelectedProducts}
        onSave={handleSavePermissions}
        isSaving={isSaving}
        hasChanges={hasChanges}
        stateName={selectedState?.name}
      />
    </div>
  );
};

export default StatePermissions;
