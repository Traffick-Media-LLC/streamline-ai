
import React from 'react';
import BrandsManagement from '../../components/product-management/BrandsManagement';
import { Card, CardContent } from "@/components/ui/card";
import ErrorBoundary from '@/components/ErrorBoundary';

const BrandsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Brand Management</h1>
      <Card>
        <CardContent className="pt-6">
          <ErrorBoundary>
            <BrandsManagement />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandsPage;
