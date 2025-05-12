
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from '@/hooks/use-mobile';
import AdminBreadcrumbs from './AdminBreadcrumbs';
import { adminNavItems } from './adminNavConfig';

const AdminContent: React.FC = () => {
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  
  return (
    <SidebarInset className="p-4 sm:p-6">
      <div className="flex flex-col w-full">
        <div className="flex flex-wrap items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-2 w-full sm:mb-0 sm:w-auto">
            {(state === "collapsed" || isMobile) && (
              <Button variant="ghost" size="icon" className="flex sm:flex" asChild>
                <SidebarTrigger>
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </SidebarTrigger>
              </Button>
            )}
            <AdminBreadcrumbs adminNav={adminNavItems} />
          </div>
        </div>
        <div className="flex-grow">
          <Outlet />
        </div>
      </div>
    </SidebarInset>
  );
};

export default AdminContent;
