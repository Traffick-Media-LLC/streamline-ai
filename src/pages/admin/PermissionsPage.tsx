
import React from 'react';
import StatePermissions from '../../components/product-management/StatePermissions';
import { Card, CardContent } from "@/components/ui/card";
import ErrorBoundary from '@/components/ErrorBoundary';

const PermissionsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">State Permissions</h1>
      <Card>
        <CardContent className="pt-6">
          <ErrorBoundary>
            <StatePermissions />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsPage;
