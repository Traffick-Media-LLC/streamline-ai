
import React from 'react';
import UserRolesManager from '../../components/admin/UserRolesManager';
import { Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const UserManagementPage: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Shield className="h-6 w-6 text-primary-500" />
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Access Control</CardTitle>
          <CardDescription>
            Manage user access and permissions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Users with the <strong>Admin</strong> role have full access to all features, 
            including the ability to manage other users and view sensitive information. 
            Users with the <strong>Basic</strong> role have limited access and cannot 
            modify organizational data or manage other users.
          </p>
        </CardContent>
      </Card>
      
      <UserRolesManager />
    </div>
  );
};

export default UserManagementPage;
