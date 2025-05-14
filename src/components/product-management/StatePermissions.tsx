import React, { useState, useEffect } from 'react';
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import { useStatePermissionsDataQuery } from "@/hooks/useStatePermissionsDataQuery";
import { useProductsData } from "@/hooks/useProductsData";
import { useStateProductMapping } from "@/hooks/useStateProductMapping";
import { StatePermissionsProps } from '@/types/statePermissions';
import { useAuth } from "@/contexts/AuthContext";
import { StatePermissionsHeader } from "./StatePermissionsHeader";
import { StatePermissionsContent } from "./StatePermissionsContent";
import { StatePermissionsDebugPanel } from "./StatePermissionsDebugPanel";
import { StatePermissionsAuthCheck } from "./StatePermissionsAuthCheck";
import { toast } from "@/components/ui/sonner";
import ErrorBoundary from '@/components/ErrorBoundary';

interface LogEntry {
  level: string;
  message: string;
  data?: any;
}

const StatePermissions: React.FC<StatePermissionsProps> = ({ onDataLoaded }) => {
  const {
    states,
    stateProducts,
    loading,
    error,
    refreshData,
    clearCache,
    hasInitialized,
    refreshCounter,
    saveStatePermissions,
    fetchProductsForState,
    isSaving,
  } = useStatePermissionsDataQuery();

  const { products, brands } = useProductsData();
  const { getStateProducts } = useStateProductMapping(stateProducts, products);
  const { isAuthenticated, isAdmin } = useAuth();

  // UI state
  const [showDebug, setShowDebug] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedState, setSelectedState] = useState<{ id: number; name: string } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [debugLogs] = useState<LogEntry[]>([]); // Properly typed as LogEntry[] instead of string[]

  // Force refresh after data load
  useEffect(() => {
    if (!loading && hasInitialized && !dataLoaded) {
      console.log("Initial data load complete, performing refresh");
      
      // Delay the refresh slightly to allow UI to render
      const timeout = setTimeout(async () => {
        await refreshData(true);
        setDataLoaded(true);
        console.log("Calling onDataLoaded callback");
        onDataLoaded?.();
      }, 400);

      return () => clearTimeout(timeout);
    }
  }, [loading, hasInitialized, onDataLoaded, dataLoaded, refreshData]);

  // Refresh after dialog close if there was a save action
  useEffect(() => {
    if (!isDialogOpen && lastUpdateTime) {
      console.log("Dialog closed after update, refreshing data");
      setLastUpdateTime(null);
      
      const refreshTimer = setTimeout(async () => {
        // First clear cache
        if (clearCache) {
          await clearCache();
        }
        
        // Then force refresh
        const success = await refreshData(true);
        if (success) {
          console.log("Data refreshed after dialog close and save");
          
          // Specifically fetch the products for the state that was just updated
          if (selectedState) {
            console.log(`Specifically refreshing data for ${selectedState.name}`);
            await fetchProductsForState(selectedState.id);
          }
        } else {
          console.error("Failed to refresh data after dialog close and save");
        }
      }, 300);
      
      return () => clearTimeout(refreshTimer);
    }
  }, [isDialogOpen, lastUpdateTime, refreshData, clearCache, selectedState, fetchProductsForState]);

  // Handle state selection
  const handleStateClick = (stateName: string) => {
    console.log("handleStateClick called with state:", stateName);
    const state = states.find(s => s.name === stateName);
    
    if (state) {
      setSelectedState(state);
      
      // Directly fetch the products for this state to ensure fresh data
      fetchProductsForState(state.id).then(stateProducts => {
        console.log(`Got ${stateProducts.length} products for ${stateName}`);
        setSelectedProducts(stateProducts.map(p => p.id));
      });
      
      setHasChanges(false);
      setIsDialogOpen(true);
      return { success: true, stateId: state.id };
    }
    
    return { success: false };
  };

  // Handle edit state
  const handleEditState = (state: { id: number; name: string }) => {
    console.log("handleEditState called with state:", state.name);
    setSelectedState(state);
    
    // Directly fetch the products for this state to ensure fresh data
    fetchProductsForState(state.id).then(stateProducts => {
      console.log(`Got ${stateProducts.length} products for ${state.name}`);
      setSelectedProducts(stateProducts.map(p => p.id));
    });
    
    setHasChanges(false);
    setIsDialogOpen(true);
    return { success: true, stateId: state.id };
  };

  // Handle save permissions with robust refresh
  const handleSavePermissions = async () => {
    if (!selectedState) {
      toast.error("No state selected");
      return;
    }
    
    console.log("Saving permissions for state:", selectedState.name, "Products:", selectedProducts);
    
    if (!hasChanges) {
      console.log("No changes detected, skipping save");
      toast.info("No changes to save");
      setIsDialogOpen(false);
      return;
    }

    setLastUpdateTime(Date.now());
    
    try {
      // First clear the cache
      if (clearCache) {
        await clearCache();
      }
      
      // Then save the permissions
      const success = await saveStatePermissions(selectedState.id, selectedProducts);
      
      if (success) {
        setHasChanges(false);
        
        // Close dialog and refresh will be triggered by the effect
        setIsDialogOpen(false);
      } else {
        toast.error("Failed to save permissions");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
    }
  };

  // Handle manual refresh
  const handleRefreshClick = async () => {
    console.log("Manual refresh requested from header");
    toast.loading("Refreshing data...", { id: "refresh-toast" });
    
    try {
      // Clear cache first
      if (clearCache) {
        await clearCache();
      }
      
      // Then force refresh
      const success = await refreshData(true);
      
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
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      error={error}
      refreshData={() => {
        toast.loading("Refreshing data...");
        refreshData(true).then(success => {
          success ? toast.success("Data refreshed successfully") : toast.error("Failed to refresh data");
        });
      }}
    />
  );

  if (!isAuthenticated || !isAdmin) {
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
          onSelectionChange={(selection) => {
            setSelectedProducts(selection);
            setHasChanges(true);
          }}
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
