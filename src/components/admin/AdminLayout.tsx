
import React from 'react';
import { Outlet, NavLink, useLocation, Link } from 'react-router-dom';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, Package, Users, BookText, Briefcase, Map, FileBarChart, ChevronRight, ArrowLeft, Menu } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useIsMobile } from '@/hooks/use-mobile';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Separate component that uses the useSidebar hook
const AdminLayoutContent = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  
  // Close sidebar when location changes on mobile
  React.useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location.pathname, isMobile, setOpenMobile]);
  
  const adminNav = [
    {
      title: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      exact: true
    }, 
    {
      title: "Product Management",
      icon: Package,
      children: [
        {
          title: "Brands",
          path: "/admin/brands",
          icon: Briefcase
        }, 
        {
          title: "Products",
          path: "/admin/products",
          icon: Package
        }, 
        {
          title: "State Permissions",
          path: "/admin/permissions",
          icon: Map
        }
      ]
    }, 
    {
      title: "Employee Management",
      icon: Users,
      children: [
        {
          title: "Employee Directory",
          path: "/admin/employees",
          icon: Users
        }, 
        {
          title: "Organization Chart",
          path: "/admin/organization",
          icon: FileBarChart
        }
      ]
    }, 
    {
      title: "Knowledge Base",
      path: "/admin/knowledge",
      icon: BookText,
      exact: true
    }
  ];
  
  const getBreadcrumbs = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    let breadcrumbs = [{
      title: 'Admin',
      path: '/admin'
    }];
    if (pathParts.length > 1 && pathParts[0] === 'admin') {
      const currentPath = pathParts[1];
      for (const item of adminNav) {
        if (item.children) {
          const childMatch = item.children.find(child => child.path.includes(`/${currentPath}`));
          if (childMatch) {
            breadcrumbs.push({
              title: item.title,
              path: ''
            });
            breadcrumbs.push({
              title: childMatch.title,
              path: childMatch.path
            });
            break;
          }
        } else if (item.path?.includes(`/${currentPath}`)) {
          breadcrumbs.push({
            title: item.title,
            path: item.path
          });
          break;
        }
      }
    }
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();
  
  // Helper function to determine if a group should be open
  const isGroupOpen = (item: any) => {
    if (item.children) {
      return item.children.some((child: any) => location.pathname === child.path);
    }
    return false;
  };
  
  // Handle navigation click - close sidebar on mobile
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  return (
    <div className="flex w-full min-h-screen bg-background">
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
          <SidebarMenu>
            {adminNav.map(item => (
              <React.Fragment key={item.title}>
                {!item.children ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      tooltip={item.title} 
                      isActive={item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)}
                    >
                      <NavLink to={item.path} className="flex items-center w-full" onClick={handleNavClick}>
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
                                <NavLink to={child.path} className="flex items-center w-full" onClick={handleNavClick}>
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
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Company Admin
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
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
              <Breadcrumb className="overflow-x-auto">
                <BreadcrumbList className="whitespace-nowrap">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {crumb.path ? (
                          <BreadcrumbLink asChild>
                            <NavLink to={crumb.path}>{crumb.title}</NavLink>
                          </BreadcrumbLink>
                        ) : (
                          <span>{crumb.title}</span>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && (
                        <BreadcrumbSeparator>
                          <ChevronRight className="h-4 w-4" />
                        </BreadcrumbSeparator>
                      )}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
          <div className="flex-grow">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </div>
  );
};

// Main component that wraps the content with SidebarProvider
const AdminLayout = () => {
  return (
    <SidebarProvider>
      <AdminLayoutContent />
    </SidebarProvider>
  );
};

export default AdminLayout;
