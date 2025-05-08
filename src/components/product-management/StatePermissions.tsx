
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
    refreshCounter // Get the refresh counter to force re-renders
  } = useStatePermissionsManager();

  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  // Enable debug panel by default to help troubleshoot
  const [showDebug, setShowDebug] = useState(true);

  // Show auth status for debugging
  React.useEffect(() => {
    console.log("StatePermissions component - Auth status:", { isAuthenticated, isAdmin, isGuest, refreshCounter });
  }, [isAuthenticated, isAdmin, isGuest, refreshCounter]);

  // On mount, perform a refresh
  useEffect(() => {
    if (isAuthenticated || isAdmin || isGuest) {
      console.log("StatePermissions: Initial data refresh");
      refreshData();
    }
  }, [isAuthenticated, isAdmin, isGuest, refreshData]);

  // When isDialogOpen changes to false (dialog closes), refresh data
  useEffect(() => {
    if (!isDialogOpen && (isAuthenticated || isAdmin || isGuest)) {
      console.log("Dialog closed, refreshing data");
      // Short delay before refresh to ensure state is updated
      setTimeout(() => {
        refreshData();
      }, 300);
    }
  }, [isDialogOpen, isAuthenticated, isAdmin, isGuest, refreshData]);

  // Force a refresh if auth state changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated || isAdmin || isGuest) {
        console.log("Auth state changed, refreshing data");
        refreshData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isAdmin, isGuest, refreshData]);

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
  if ((!isAuthenticated && !isGuest) || (!isAdmin && !isGuest) || error) {
    return authCheckComponent;
  }

  // Otherwise, render the main content
  return (
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
  );
};

export default StatePermissions;
