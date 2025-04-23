
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandsManagement from '../components/product-management/BrandsManagement';
import ProductsManagement from '../components/product-management/ProductsManagement';
import StatePermissions from '../components/product-management/StatePermissions';
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const AdminPage: React.FC = () => {
  const { user, userRole } = useAuth();
  const [isCheckingRole, setIsCheckingRole] = useState(false);
  
  // Function to check and assign admin role if needed
  const checkAndAssignAdminRole = async () => {
    if (!user) return;
    
    setIsCheckingRole(true);
    try {
      // Check if user already has admin role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      // If user doesn't have any role or doesn't have admin role, assign it
      if (!existingRole || existingRole.role !== 'admin') {
        const { error: insertError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: user.id,
            role: 'admin'
          });
        
        if (insertError) throw insertError;
        toast.success("Admin privileges granted");
        
        // Force page reload to update Auth context
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error("Error checking/assigning admin role:", error);
      toast.error("Failed to verify admin privileges");
    } finally {
      setIsCheckingRole(false);
    }
  };

  // Debug information about current user and role
  const userDebugInfo = () => {
    return (
      <div className="mb-4 p-4 bg-muted rounded-md">
        <h3 className="font-medium mb-2">User Debug Info</h3>
        <p>User ID: {user?.id || 'Not logged in'}</p>
        <p>Current Role: {userRole || 'No role assigned'}</p>
        <div className="mt-2">
          <button 
            className="bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 text-sm"
            onClick={checkAndAssignAdminRole}
            disabled={isCheckingRole}
          >
            {isCheckingRole ? 'Checking...' : 'Verify/Assign Admin Privileges'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {userDebugInfo()}
      
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
