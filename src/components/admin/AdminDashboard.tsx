
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, BookText, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProductsData } from '@/hooks/useProductsData';
import { useEmployeesData } from '@/hooks/useEmployeesData';

const AdminDashboard = () => {
  const { products, brands, loading: productsLoading } = useProductsData();
  const { data: employees, isLoading: employeesLoading } = useEmployeesData();

  const dashboardCards = [
    {
      title: "Products",
      description: "Manage products and brands",
      icon: <Package className="h-8 w-8 text-primary" />,
      stats: !productsLoading ? [
        { label: "Total Products", value: products?.length || 0 },
        { label: "Total Brands", value: brands?.length || 0 }
      ] : [],
      link: "/admin/products",
      loading: productsLoading
    },
    {
      title: "Employees",
      description: "Manage employee directory and org chart",
      icon: <Users className="h-8 w-8 text-primary" />,
      stats: !employeesLoading ? [
        { label: "Total Employees", value: employees?.length || 0 },
        { label: "Departments", value: [...new Set(employees?.map(e => e.department) || [])].length }
      ] : [],
      link: "/admin/employees",
      loading: employeesLoading
    },
    {
      title: "Knowledge Base",
      description: "Manage knowledge entries and resources",
      icon: <BookText className="h-8 w-8 text-primary" />,
      stats: [],
      link: "/admin/knowledge",
      loading: false
    },
    {
      title: "Organization",
      description: "View organization structure",
      icon: <BarChart className="h-8 w-8 text-primary" />,
      stats: [],
      link: "/admin/organization",
      loading: false
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card, index) => (
          <Link to={card.link} key={index} className="transition-transform hover:-translate-y-1">
            <Card className="h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  {card.icon}
                  <CardTitle>{card.title}</CardTitle>
                </div>
                <CardDescription className="text-sm">{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {card.loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-4/5"></div>
                  </div>
                ) : (
                  <div>
                    {card.stats.map((stat, i) => (
                      <div key={i} className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{stat.label}:</span>
                        <span className="font-semibold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 text-xs text-muted-foreground">
                Click to manage {card.title.toLowerCase()}
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
