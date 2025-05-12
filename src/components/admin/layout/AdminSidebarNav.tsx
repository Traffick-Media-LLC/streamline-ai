
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

// Define the nav item type
type AdminNavItem = {
  title: string;
  path?: string;
  icon: React.ComponentType<any>;
  exact?: boolean;
  children?: {
    title: string;
    path: string;
    icon: React.ComponentType<any>;
  }[];
};

interface AdminSidebarNavProps {
  adminNav: AdminNavItem[];
  onNavClick: () => void;
}

const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({ adminNav, onNavClick }) => {
  const location = useLocation();

  // Helper function to determine if a group should be open
  const isGroupOpen = (item: AdminNavItem) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return false;
  };

  return (
    <SidebarMenu>
      {adminNav.map(item => (
        <React.Fragment key={item.title}>
          {!item.children ? (
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title} 
                isActive={item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path || '')}
              >
                <NavLink to={item.path || ''} className="flex items-center w-full" onClick={onNavClick}>
                  <item.icon className="mr-2 h-5 w-5" />
                  <span>{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <Collapsible defaultOpen={isGroupOpen(item)}>
              <CollapsibleTrigger className="flex items-center w-full px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground">
                <item.icon className="mr-2 h-5 w-5" />
                <span className="flex-1">{item.title}</span>
                <ChevronRight className="h-4 w-4 transition-transform duration-200 collapsible-trigger-icon" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-4 pl-2 border-l">
                  <SidebarMenu>
                    {item.children.map(child => (
                      <SidebarMenuItem key={child.path}>
                        <SidebarMenuButton 
                          asChild 
                          tooltip={child.title} 
                          isActive={location.pathname === child.path}
                        >
                          <NavLink to={child.path} className="flex items-center w-full" onClick={onNavClick}>
                            <child.icon className="mr-2 h-5 w-5" />
                            <span>{child.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </React.Fragment>
      ))}
    </SidebarMenu>
  );
};

export default AdminSidebarNav;
