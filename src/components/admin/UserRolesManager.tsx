
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRoles } from '@/hooks/useUserRoles';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const UserRolesManager = () => {
  const { users, isLoading, error, updateUserRole } = useUserRoles();
  const [searchTerm, setSearchTerm] = useState("");
  const [userToUpdate, setUserToUpdate] = useState<{id: string, email: string, newRole: 'admin' | 'basic'} | null>(null);

  // Filter users based on search term
  const filteredUsers = users?.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return user.email.toLowerCase().includes(searchLower);
  });

  const handleRoleChange = (userId: string, email: string, newRole: 'admin' | 'basic') => {
    setUserToUpdate({ id: userId, email, newRole });
  };

  const confirmRoleChange = () => {
    if (userToUpdate) {
      updateUserRole.mutate({ userId: userToUpdate.id, role: userToUpdate.newRole });
      setUserToUpdate(null);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load user data. Please try again later.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Role Management</CardTitle>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role?.role === 'admin' ? "secondary" : "outline"}>
                      {user.role?.role || 'basic'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            {user.email ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-sm">Active</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-4 w-4 text-amber-500 mr-1" />
                                <span className="text-sm">Inactive</span>
                              </>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {user.email ? "User has a verified email" : "User has not verified their email"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role?.role || 'basic'}
                      onValueChange={(newRole: 'admin' | 'basic') => {
                        if (newRole !== user.role?.role) {
                          handleRoleChange(user.id, user.email, newRole);
                        }
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No users found matching the search criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <AlertDialog open={!!userToUpdate} onOpenChange={() => setUserToUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the role of <strong>{userToUpdate?.email}</strong> to <strong>{userToUpdate?.newRole}</strong>?
              {userToUpdate?.newRole === 'admin' && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                  <AlertTriangle className="h-4 w-4 inline-block mr-1" />
                  Warning: This will grant the user full administrative privileges.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UserRolesManager;
