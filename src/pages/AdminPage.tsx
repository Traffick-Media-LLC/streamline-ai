
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandsManagement from '../components/product-management/BrandsManagement';
import ProductsManagement from '../components/product-management/ProductsManagement';
import StatePermissions from '../components/product-management/StatePermissions';

const AdminPage: React.FC = () => {
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
