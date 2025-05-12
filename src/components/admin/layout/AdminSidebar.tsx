
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarRail 
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import AdminSidebarNav from './AdminSidebarNav';
import { adminNavItems } from './adminNavConfig';

interface AdminSidebarProps {
  onNavClick: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onNavClick }) => {
  const { user } = useAuth();
  
  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="text-xl font-semibold text-primary">Admin Portal</div>
        <div className="text-sm text-muted-foreground truncate">
          {user?.email}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground">
            <ArrowLeft className="h-4 w-4" />
            Return to Site
          </Link>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <AdminSidebarNav adminNav={adminNavItems} onNavClick={onNavClick} />
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Company Admin
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
};

export default AdminSidebar;
