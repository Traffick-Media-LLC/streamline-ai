import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BookText, 
  Briefcase, 
  Map,
  FileBarChart,
  ChevronRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useAuth } from "@/contexts/AuthContext";

const AdminLayout = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const adminNav = [
    {
      title: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      exact: true
    },
    {
      title: "User Management",
      path: "/admin/users",
      icon: Users,
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
    
    let breadcrumbs = [{ title: 'Admin', path: '/admin' }];
    
    if (pathParts.length > 1 && pathParts[0] === 'admin') {
      const currentPath = pathParts[1];
      
      for (const item of adminNav) {
        if (item.children) {
          const childMatch = item.children.find(child => 
            child.path.includes(`/${currentPath}`)
          );
          
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
          breadcrumbs.push({ title: item.title, path: item.path });
          break;
        }
      }
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-background">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <div className="text-xl font-semibold text-primary">Admin Portal</div>
            <div className="text-sm text-muted-foreground">
              {user?.email}
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <React.Fragment key={item.title}>
                  {!item.children ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)}
                      >
                        <NavLink to={item.path} className="flex items-center w-full">
                          <item.icon className="mr-2 h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    <SidebarGroup>
                      <SidebarGroupLabel>
                        <item.icon className="mr-2 h-5 w-5" />
                        {item.title}
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {item.children.map((child) => (
                            <SidebarMenuItem key={child.path}>
                              <SidebarMenuButton
                                asChild
                                tooltip={child.title}
                                isActive={location.pathname === child.path}
                              >
                                <NavLink to={child.path} className="flex items-center w-full">
                                  <child.icon className="mr-2 h-5 w-5" />
                                  <span>{child.title}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
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
        <SidebarInset className="p-6">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between mb-6">
              <Breadcrumb>
                <BreadcrumbList>
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
              <SidebarTrigger />
            </div>
            <div className="flex-grow">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
