
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
    hasInitialized,
    fetchProductsForState
  } = useStatePermissionsManager();

  const { isAuthenticated, isAdmin, isGuest } = useAuth();
  const [showDebug, setShowDebug] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Ensure all states with products are preloaded properly
  useEffect(() => {
    if (states.length > 0 && hasInitialized && !loading) {
      console.log("Ensuring all states have proper data loaded...");
      // Prefetch Alabama specifically to ensure it has products
      const alabama = states.find(state => state.name === 'Alabama');
      if (alabama) {
        console.log("Pre-fetching products for Alabama (ID:", alabama.id, ")");
        fetchProductsForState(alabama.id);
      }
    }
  }, [states, hasInitialized, loading, fetchProductsForState]);

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

  // Only refresh after dialog close if there was a save action
  useEffect(() => {
    if (!isDialogOpen && lastUpdateTime) {
      console.log("Dialog closed after update, refreshing data");
      setLastUpdateTime(null);
      
      const refreshTimer = setTimeout(() => {
        refreshData().then(success => {
          if (success) {
            console.log("Data refreshed after dialog close and save");
          } else {
            console.error("Failed to refresh data after dialog close and save");
          }
        });
      }, 300);
      
      return () => clearTimeout(refreshTimer);
    }
  }, [isDialogOpen, lastUpdateTime, refreshData]);
  
  const handleSaveWithTracking = async () => {
    console.log("Save requested, will track update time");
    setLastUpdateTime(Date.now());
    await handleSavePermissions();
  };

  const handleRefreshClick = async () => {
    console.log("Manual refresh requested from header");
    try {
      toast.loading("Refreshing data...", { id: "refresh-toast" });
      const success = await refreshData();
      if (success) {
        toast.success("Data refreshed successfully", { id: "refresh-toast" });
        setDataLoaded(false); // Reset to trigger onDataLoaded callback
        
        // Explicitly refresh Alabama's products
        const alabama = states.find(state => state.name === 'Alabama');
        if (alabama) {
          console.log("Explicitly refreshing Alabama products");
          await fetchProductsForState(alabama.id);
        }
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
          states={states}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          getStateProducts={getStateProducts}
          onEditState={handleEditState}
          refreshCounter={refreshCounter}
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
