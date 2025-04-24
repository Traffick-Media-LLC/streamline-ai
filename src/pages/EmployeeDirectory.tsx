
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useEmployeesData, Employee } from "@/hooks/useEmployeesData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrgChart from "@/components/OrgChart";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";

const EmployeeDirectory = () => {
  const { data: employees, isLoading, error } = useEmployeesData();
  const [searchTerm, setSearchTerm] = useState("");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  const filteredEmployees = employees?.filter((employee) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      employee.first_name.toLowerCase().includes(searchTermLower) ||
      employee.last_name.toLowerCase().includes(searchTermLower) ||
      employee.department.toLowerCase().includes(searchTermLower) ||
      employee.email.toLowerCase().includes(searchTermLower)
    );
  });

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              Error loading employee data. Please try again later.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Employee Directory</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table">
            <TabsList className="mb-4">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="org">Org Chart</TabsTrigger>
            </TabsList>
            
            <TabsContent value="table">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees?.map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </TableCell>
                          <TableCell>{employee.department}</TableCell>
                          <TableCell>{employee.title}</TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${employee.email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {employee.email}
                            </a>
                          </TableCell>
                          <TableCell>
                            {employee.phone ? (
                              <a
                                href={`tel:${employee.phone}`}
                                className="text-blue-600 hover:underline"
                              >
                                {employee.phone}
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(employee.email)}
                            >
                              Copy Email
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredEmployees?.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      No employees found
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="org">
              <ErrorBoundary>
                {isLoading ? (
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  employees && employees.length > 0 ? (
                    <OrgChart employees={employees} />
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No employee data available
                    </div>
                  )
                )}
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDirectory;

