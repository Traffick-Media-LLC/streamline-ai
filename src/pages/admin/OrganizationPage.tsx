
import React from 'react';
import OrgChartImageUploader from '../../components/admin/OrgChartImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const OrganizationPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Organization Chart</h1>
      <Card>
        <CardHeader>
          <CardTitle>Organization Chart Image</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgChartImageUploader />
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationPage;
