
import React from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ChevronRight } from 'lucide-react';

// Helper types for the breadcrumb items
type BreadcrumbItem = {
  title: string;
  path: string;
};

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

interface AdminBreadcrumbsProps {
  adminNav: AdminNavItem[];
}

const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({ adminNav }) => {
  const location = useLocation();
  
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

  return (
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
  );
};

export default AdminBreadcrumbs;
