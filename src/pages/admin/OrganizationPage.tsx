
import React from 'react';
import AdminOrgChart from '../../components/admin/AdminOrgChart';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OrganizationPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Organization Chart</h1>
      <Card>
        <CardHeader>
          <CardTitle>Employee Reporting Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminOrgChart />
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationPage;
