import React, { useState } from 'react';
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import { useStatePermissionsManager } from "@/hooks/useStatePermissionsManager";
import { StatePermissionsProps } from '@/types/statePermissions';
import { useAuth } from "@/contexts/AuthContext";
import { StatePermissionsHeader } from "./StatePermissionsHeader";
import { StatePermissionsContent } from "./StatePermissionsContent";
import { StatePermissionsDebugPanel } from "./StatePermissionsDebugPanel";
import { StatePermissionsAuthCheck } from "./StatePermissionsAuthCheck";

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

  // Create auth check component but don't render immediately
  const authCheckComponent = (
    <StatePermissionsAuthCheck 
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      error={error}
      refreshData={refreshData}
    />
  );
  
  // If there are auth issues or errors, render the auth check component
  if (!isAuthenticated || !isAdmin || error) {
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
