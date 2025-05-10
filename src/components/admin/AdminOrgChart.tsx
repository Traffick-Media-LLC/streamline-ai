
import React, { useState } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import OrgChart from '@/components/OrgChart';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import EmployeeFormDialog from './EmployeeFormDialog';

const AdminOrgChart = () => {
  const { data: employees, isLoading, error, refetch } = useEmployeesData();
  const { isAdmin } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  if (error) {
    return (
      <div className="text-center text-red-500">
        Error loading organization data. Please try again later.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="text-sm text-muted-foreground">
          {isAdmin && "Drag employees to reassign managers • Right-click for more options"}
        </div>
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

      <ErrorBoundary>
        {isLoading ? (
          <div className="h-[600px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
          <OrgChart 
            employees={employees || []} 
            isAdmin={isAdmin} 
            editable 
          />
        )}
      </ErrorBoundary>
      
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
