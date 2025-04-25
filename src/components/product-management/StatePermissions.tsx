
import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, MapPin, List } from "lucide-react";
import { ProductSelectionDialog } from "./ProductSelectionDialog";
import { StatePermissionsList } from "./StatePermissionsList";
import { StatePermissionsMap } from "./StatePermissionsMap";
import { useStatePermissionsManager } from "@/hooks/useStatePermissionsManager";
import { StatePermissionsProps } from '@/types/statePermissions';

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
    refreshData
  } = useStatePermissionsManager();

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
          >
            <MapPin className="mr-2 h-4 w-4" />
            Map View
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'default' : 'outline'} 
            onClick={() => setViewMode('list')}
          >
            <List className="mr-2 h-4 w-4" />
            List View
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
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
      />
    </div>
  );
};

export default StatePermissions;
