
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import AdminSidebarNav from './AdminSidebarNav';
import { adminNavItems } from './adminNavConfig';

interface AdminSidebarProps {
  onNavClick: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onNavClick }) => {
  const { user } = useAuth();
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  
  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="text-xl font-semibold text-primary">Admin Portal</div>
        {state !== "collapsed" && (
          <>
            <div className="text-sm text-muted-foreground truncate">
              {user?.email}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
                <ArrowLeft className="h-4 w-4" />
                Return to Site
              </Link>
            </div>
          </>
        )}
      </SidebarHeader>
      
      <SidebarContent className={cn(isMobile && "py-2")}>
        <AdminSidebarNav adminNav={adminNavItems} onNavClick={onNavClick} />
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        {state !== "collapsed" && (
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Company Admin
          </div>
        )}
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
};

import { cn } from "@/lib/utils";

export default AdminSidebar;
