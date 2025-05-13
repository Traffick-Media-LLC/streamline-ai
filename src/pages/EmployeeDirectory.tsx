
import React, { useEffect } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { supabase } from '@/integrations/supabase/client';
import OrgChartViewer from '@/components/OrgChartViewer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { logError, logEvent, generateRequestId } from '@/utils/logging';
import { useAuth } from '@/contexts/AuthContext';
import { ensureBucketAccess } from '@/utils/storage/ensureBucketAccess';

const EmployeeDirectory: React.FC = () => {
  const { data: employees = [], isLoading, error } = useEmployeesData();
  const { user } = useAuth();
  const pageRequestId = generateRequestId();

  // Check if the org_chart bucket exists and create it if it doesn't
  useEffect(() => {
    const initOrgChartStorage = async () => {
      try {
        await logEvent({
          requestId: pageRequestId,
          userId: user?.id,
          eventType: 'init_org_chart_storage',
          component: 'EmployeeDirectory',
          message: 'Initializing org chart storage',
          metadata: {},
          severity: 'info'
        });

        const result = await ensureBucketAccess(user?.id);
        
        if (!result.success) {
          await logError(
            pageRequestId,
            'EmployeeDirectory',
            'Error initializing org chart bucket',
            result.error,
            { message: result.message },
            'warning'
          );
          
          console.error('Failed to initialize org chart bucket:', result.error || result.message);
        }
      } catch (error) {
        await logError(
          pageRequestId,
          'EmployeeDirectory',
          'Exception initializing org chart storage',
          error,
          {},
          'error'
        );
        console.error('Exception initializing org_chart storage:', error);
      }
    };

    initOrgChartStorage();
  }, [user?.id, pageRequestId]);

  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error loading employee data: {error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Employee Directory</h1>

      <div className="p-1">
        <OrgChartViewer employees={employees} />
      </div>
    </div>
  );
};

export default EmployeeDirectory;
