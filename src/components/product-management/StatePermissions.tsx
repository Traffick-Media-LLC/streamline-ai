
import React, { useState, useEffect } from 'react';
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import { useStatePermissionsManager } from "@/hooks/useStatePermissionsManager";
import { StatePermissionsProps } from '@/types/statePermissions';
import { useAuth } from "@/contexts/AuthContext";
import { StatePermissionsHeader } from "./StatePermissionsHeader";
import { StatePermissionsContent } from "./StatePermissionsContent";
import { StatePermissionsDebugPanel } from "./StatePermissionsDebugPanel";
import { StatePermissionsAuthCheck } from "./StatePermissionsAuthCheck";
import { toast } from "@/components/ui/sonner";
import ErrorBoundary from '@/components/ErrorBoundary';

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
    debugLogs,
    refreshCounter,
    hasInitialized
  } = useStatePermissionsManager();

  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  // Enable debug panel by default to help troubleshoot
  const [showDebug, setShowDebug] = useState(true);

  // Show auth status for debugging
  React.useEffect(() => {
    console.log("StatePermissions component - Auth status:", { 
      isAuthenticated, 
      isAdmin, 
      isGuest, 
      refreshCounter,
      hasInitialized,
      statesCount: states.length,
      productsCount: products.length
    });
  }, [isAuthenticated, isAdmin, isGuest, refreshCounter, hasInitialized, states.length, products.length]);

  // Add effect to automatically refresh data periodically when the dialog is open
  React.useEffect(() => {
    if (isDialogOpen && selectedState) {
      // Set up a refresh interval while the dialog is open
      const refreshInterval = setInterval(() => {
        console.log("Dialog is open - performing background data refresh");
        refreshData().catch(err => console.error("Background refresh failed:", err));
      }, 5000); // Refresh every 5 seconds while dialog is open
      
      return () => clearInterval(refreshInterval);
    }
  }, [isDialogOpen, selectedState, refreshData]);

  // Create auth check component but don't render immediately
  const authCheckComponent = (
    <StatePermissionsAuthCheck 
      isAuthenticated={isAuthenticated || isGuest}
      isAdmin={isAdmin || isGuest}
      error={error}
      refreshData={() => {
        toast.loading("Refreshing data...");
        refreshData().then(success => {
          if (success) {
            toast.success("Data refreshed successfully");
          } else {
            toast.error("Failed to refresh data");
          }
        });
      }}
    />
  );
  
  // If there are auth issues or errors, render the auth check component
  if ((!isAuthenticated && !isGuest) || (!isAdmin && !isGuest)) {
    return authCheckComponent;
  }

  // Show error state if we have an error after initialization
  if (error && hasInitialized) {
    return authCheckComponent;
  }

  // Otherwise, render the main content
  return (
    <ErrorBoundary>
      <div>
        <StatePermissionsHeader 
          viewMode={viewMode}
          setViewMode={setViewMode}
          refreshData={refreshData}
          loading={loading}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
        />

        <StatePermissionsDebugPanel 
          debugLogs={debugLogs}
          showDebug={showDebug}
          setShowDebug={setShowDebug}
        />

        <StatePermissionsContent 
          loading={loading}
          viewMode={viewMode}
          states={states}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          getStateProducts={getStateProducts}
          onEditState={handleEditState}
          handleStateClick={handleStateClick}
        />

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
    </ErrorBoundary>
  );
};

export default StatePermissions;
