
import { 
  Users, 
  FileText, 
  Box, 
  ShoppingBag, 
  Shield, 
  Network, 
  Building2,
  Database,
  FileBox
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: any;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const adminNavConfig: NavSection[] = [
  {
    title: "Organization",
    items: [
      {
        title: "Employee Directory",
        href: "/admin/employees",
        icon: Users,
      },
      {
        title: "Organization Chart",
        href: "/admin/organization",
        icon: Network,
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        title: "Knowledge Base",
        href: "/admin/knowledge",
        icon: FileText,
      },
      {
        title: "Drive Files",
        href: "/admin/drive-files",
        icon: FileBox,
      },
    ],
  },
  {
    title: "Products",
    items: [
      {
        title: "Brands",
        href: "/admin/brands",
        icon: Building2,
      },
      {
        title: "Products",
        href: "/admin/products",
        icon: Box,
      },
      {
        title: "State Permissions",
        href: "/admin/permissions",
        icon: ShoppingBag,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Admin",
        href: "/admin",
        icon: Shield,
      },
      {
        title: "Database",
        href: "/admin/database",
        icon: Database,
      },
    ],
  },
];
