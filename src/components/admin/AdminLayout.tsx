
import React from 'react';
import { SidebarProvider } from "@/components/ui/sidebar";
import AdminLayoutContent from './layout/AdminLayoutContent';

// Main component that wraps the content with SidebarProvider
const AdminLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <AdminLayoutContent />
    </SidebarProvider>
  );
};

export default AdminLayout;
