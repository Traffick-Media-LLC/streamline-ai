
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

const StatePermissions: React.FC<StatePermissionsProps> = ({ onDataLoaded }) => {
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
  const [showDebug, setShowDebug] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Notify parent when data finishes loading
  useEffect(() => {
    if (!loading && hasInitialized && !dataLoaded) {
      setDataLoaded(true);
      const timeout = setTimeout(() => {
        console.log("Calling onDataLoaded callback");
        onDataLoaded?.();
      }, 400); // Slight delay for smoother UX

      return () => clearTimeout(timeout);
    }
  }, [loading, hasInitialized, onDataLoaded, dataLoaded]);

  useEffect(() => {
    console.log("Auth status:", { isAuthenticated, isAdmin, isGuest, refreshCounter, hasInitialized });
  }, [isAuthenticated, isAdmin, isGuest, refreshCounter, hasInitialized]);

  useEffect(() => {
    if (!isDialogOpen && lastUpdateTime) {
      setLastUpdateTime(null);
      const refreshTimer = setTimeout(() => {
        refreshData().then(success => {
          if (success) {
            console.log("Data refreshed after dialog close");
          } else {
            console.error("Failed to refresh data after dialog close");
          }
        });
      }, 300);
      return () => clearTimeout(refreshTimer);
    }
  }, [isDialogOpen, lastUpdateTime, refreshData]);

  useEffect(() => {
    if (isDialogOpen && selectedState) {
      const refreshInterval = setInterval(() => {
        console.log("Background refresh triggered");
        refreshData().catch(err => console.error("Background refresh failed:", err));
      }, 5000);
      return () => clearInterval(refreshInterval);
    }
  }, [isDialogOpen, selectedState, refreshData]);

  const handleSaveWithTracking = async () => {
    setLastUpdateTime(Date.now());
    await handleSavePermissions();
    setTimeout(() => {
      refreshData();
    }, 1000);
  };

  const handleRefreshClick = async () => {
    console.log("Manual refresh requested from header");
    try {
      toast.loading("Refreshing data...", { id: "refresh-toast" });
      const success = await refreshData();
      if (success) {
        toast.success("Data refreshed successfully", { id: "refresh-toast" });
        setDataLoaded(false); // Reset to trigger onDataLoaded callback
      } else {
        toast.error("Failed to refresh data", { id: "refresh-toast" });
      }
    } catch (error) {
      console.error("Error during refresh:", error);
      toast.error("Error occurred during refresh", { id: "refresh-toast" });
    }
  };

  const authCheckComponent = (
    <StatePermissionsAuthCheck 
      isAuthenticated={isAuthenticated || isGuest}
      isAdmin={isAdmin || isGuest}
      error={error}
      refreshData={() => {
        toast.loading("Refreshing data...");
        refreshData().then(success => {
          success ? toast.success("Data refreshed successfully") : toast.error("Failed to refresh data");
        });
      }}
    />
  );

  if ((!isAuthenticated && !isGuest) || (!isAdmin && !isGuest)) {
    return authCheckComponent;
  }

  if (error && hasInitialized) {
    return authCheckComponent;
  }

  return (
    <ErrorBoundary>
      <div>
        <StatePermissionsHeader 
          viewMode={viewMode}
          setViewMode={setViewMode}
          refreshData={handleRefreshClick}
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
          onSave={handleSaveWithTracking}
          isSaving={isSaving}
          hasChanges={hasChanges}
          stateName={selectedState?.name}
        />
      </div>
    </ErrorBoundary>
  );
};

export default StatePermissions;
