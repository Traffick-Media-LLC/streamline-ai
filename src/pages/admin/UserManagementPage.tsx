
import React from 'react';
import UserRolesManager from '../../components/admin/UserRolesManager';

const UserManagementPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      <UserRolesManager />
    </div>
  );
};

export default UserManagementPage;
