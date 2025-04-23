
import React, { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandsManagement from '../components/product-management/BrandsManagement';
import ProductsManagement from '../components/product-management/ProductsManagement';
import StatePermissions from '../components/product-management/StatePermissions';
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

const AdminPage: React.FC = () => {
  const { user, userRole, isAuthenticated, isAdmin, loading } = useAuth();

  // Early redirect when we know the user is not authenticated
  if (!loading && !isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  // Early redirect when we know the user is authenticated but not admin
  if (!loading && isAuthenticated && !isAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <Alert className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access the admin area.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="permissions">State Permissions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="brands" className="mt-6">
          <BrandsManagement />
        </TabsContent>
        
        <TabsContent value="products" className="mt-6">
          <ProductsManagement />
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-6">
          <StatePermissions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
