
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { ReactFlowProvider } from '@xyflow/react';
import OrgChart from '@/components/OrgChart';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeOperations } from '@/hooks/useEmployeeOperations';
import EmployeeFormDialog from './EmployeeFormDialog';

const AdminOrgChart = () => {
  const { data: employees, isLoading, error, refetch } = useEmployeesData();
  const { isAdmin } = useAuth();
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            Error loading organization data. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Organization Chart</h1>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle>Visualize Company Structure</CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAddDialog(true)}
                disabled={isLoading}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ErrorBoundary>
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <ReactFlowProvider>
                <OrgChart 
                  employees={employees || []} 
                  isAdmin={isAdmin} 
                  editable 
                />
              </ReactFlowProvider>
            )}
          </ErrorBoundary>
        </CardContent>
      </Card>
      
      {/* Add Employee Dialog */}
      {showAddDialog && (
        <EmployeeFormDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          employees={employees || []}
          onSuccess={() => {
            refetch();
            setShowAddDialog(false);
          }}
        />
      )}
    </div>
  );
};

export default AdminOrgChart;
