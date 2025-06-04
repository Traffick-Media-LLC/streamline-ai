
import React from 'react';
import StateExciseTaxesManagement from '@/components/product-management/StateExciseTaxesManagement';

const ExciseTaxesPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">State Excise Taxes</h1>
        <p className="text-muted-foreground">
          Manage excise tax information for each state. Add tax rates, regulations, and other relevant tax details.
        </p>
      </div>
      
      <StateExciseTaxesManagement />
    </div>
  );
};

export default ExciseTaxesPage;
