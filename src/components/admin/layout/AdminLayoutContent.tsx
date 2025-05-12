
import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from '@/hooks/use-mobile';
import AdminSidebar from './AdminSidebar';
import AdminContent from './AdminContent';

const AdminLayoutContent: React.FC = () => {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  
  // Close sidebar when location changes on mobile
  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);
  
  // Handle navigation click - close sidebar on mobile
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <div className="flex w-full min-h-screen bg-background">
      <AdminSidebar onNavClick={handleNavClick} />
      <AdminContent />
    </div>
  );
};

export default AdminLayoutContent;
