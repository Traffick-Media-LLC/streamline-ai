
import { LayoutDashboard, Package, Users, BookText, Briefcase, Map, FileBarChart, Database, Calculator } from 'lucide-react';

// Define the type for navigation items
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

// Configuration for admin navigation
export const adminNavItems: AdminNavItem[] = [
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
        title: "State Management",
        path: "/admin/permissions",
        icon: Map
      },
      {
        title: "Product Ingredients",
        path: "/admin/ingredients",
        icon: Database
      },
      {
        title: "State Excise Taxes",
        path: "/admin/excise-taxes",
        icon: Calculator
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
