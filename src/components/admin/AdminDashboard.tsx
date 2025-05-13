
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, BookText, BarChart, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProductsData } from '@/hooks/useProductsData';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { useStatePermissionsDataQuery } from '@/hooks/useStatePermissionsDataQuery';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';

const AdminDashboard = () => {
  const { products, brands, loading: productsLoading, refreshData: refreshProducts } = useProductsData();
  const { data: employees, isLoading: employeesLoading } = useEmployeesData();
  const { states, stateProducts, refreshData: refreshStateData } = useStatePermissionsDataQuery();
  const queryClient = useQueryClient();

  // Calculate states with products
  const statesWithProducts = React.useMemo(() => {
    const stateIds = new Set(stateProducts.map(sp => sp.state_id));
    return stateIds.size;
  }, [stateProducts]);

  // Calculate total product assignments
  const totalProductAssignments = stateProducts.length;

  // Function to refresh all dashboard data
  const refreshAllData = async () => {
    toast.loading("Refreshing dashboard data...", { id: "refresh-dashboard" });
    try {
      await Promise.all([
        refreshProducts(),
        refreshStateData(true),
        queryClient.invalidateQueries({ queryKey: ['employees'] })
      ]);
      toast.success("Dashboard data refreshed", { id: "refresh-dashboard" });
    } catch (error) {
      toast.error("Error refreshing dashboard data", { id: "refresh-dashboard" });
      console.error("Dashboard refresh error:", error);
    }
  };

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
      title: "State Permissions",
      description: "Manage product permissions by state",
      icon: <BarChart className="h-8 w-8 text-primary" />,
      stats: [
        { label: "States with Products", value: statesWithProducts },
        { label: "Total States", value: states.length },
        { label: "Product Assignments", value: totalProductAssignments }
      ],
      link: "/admin/permissions",
      loading: false
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
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button variant="outline" size="sm" onClick={refreshAllData} className="flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh Data
        </Button>
      </div>
      
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
