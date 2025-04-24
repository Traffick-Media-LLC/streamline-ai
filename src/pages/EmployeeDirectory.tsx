
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

const EmployeeDirectory = () => {
  const { data: employees, isLoading } = useEmployeesData();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = employees?.filter((employee) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      employee.first_name.toLowerCase().includes(searchTermLower) ||
      employee.last_name.toLowerCase().includes(searchTermLower) ||
      employee.department.toLowerCase().includes(searchTermLower) ||
      employee.email.toLowerCase().includes(searchTermLower)
    );
  });

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
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees?.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDirectory;
