
import React from 'react';
import ProductsManagement from '../../components/product-management/ProductsManagement';
import { Card, CardContent } from "@/components/ui/card";
import ErrorBoundary from '@/components/ErrorBoundary';

const ProductsPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Product Management</h1>
      <Card>
        <CardContent className="pt-6">
          <ErrorBoundary>
            <ProductsManagement />
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductsPage;
