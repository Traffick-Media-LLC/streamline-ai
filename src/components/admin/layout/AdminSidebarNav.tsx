import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  
  // Initialize open groups based on current location
  useEffect(() => {
    const newOpenGroups: Record<string, boolean> = {};
    
    adminNav.forEach(item => {
      if (item.children) {
        const isOpen = item.children.some(child => location.pathname === child.path);
        if (isOpen) {
          newOpenGroups[item.title] = true;
        }
      }
    });
    
    setOpenGroups(newOpenGroups);
  }, [location.pathname, adminNav]);
  
  // Handle group toggle while keeping track of open state
  const handleGroupToggle = (title: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };
  
  // Handle individual nav item click
  const handleItemClick = () => {
    onNavClick();
  };
  
  // Determine if link is active based on path and exact match
  const isLinkActive = (path: string | undefined, exact: boolean | undefined): boolean => {
    if (!path) return false;
    return exact ? location.pathname === path : location.pathname.startsWith(path);
  };

  return (
    <SidebarMenu>
      {adminNav.map(item => (
        <React.Fragment key={item.title}>
          {!item.children ? (
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                tooltip={state === "collapsed" ? item.title : undefined} 
                isActive={isLinkActive(item.path, item.exact)}
              >
                <NavLink 
                  to={item.path || ''} 
                  className={cn(
                    "flex items-center w-full",
                    isMobile && "py-3"
                  )} 
                  onClick={handleItemClick}
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  <span className="flex-1 truncate">{item.title}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <Collapsible 
              open={!!openGroups[item.title]} 
              onOpenChange={() => handleGroupToggle(item.title)}
            >
              <CollapsibleTrigger className={cn(
                "flex items-center w-full px-2 py-2 rounded-md hover:bg-accent hover:text-accent-foreground",
                isMobile && "py-3"
              )}>
                <item.icon className="mr-2 h-5 w-5" />
                <span className="flex-1 truncate">{item.title}</span>
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    openGroups[item.title] ? "transform rotate-90" : ""
                  )} 
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className={cn(
                  "ml-4 pl-2 border-l",
                  isMobile && "ml-5 pl-3"
                )}>
                  <SidebarMenu>
                    {item.children.map(child => (
                      <SidebarMenuItem key={child.path}>
                        <SidebarMenuButton 
                          asChild 
                          tooltip={state === "collapsed" ? child.title : undefined} 
                          isActive={location.pathname === child.path}
                        >
                          <NavLink 
                            to={child.path} 
                            className={cn(
                              "flex items-center w-full",
                              isMobile && "py-3"
                            )} 
                            onClick={handleItemClick}
                          >
                            <child.icon className="mr-2 h-5 w-5" />
                            <span className="flex-1 truncate">{child.title}</span>
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
