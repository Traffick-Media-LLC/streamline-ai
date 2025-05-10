
import React, { useEffect } from 'react';
import { useEmployeesData } from '@/hooks/useEmployeesData';
import { supabase } from '@/integrations/supabase/client';
import OrgChartViewer from '@/components/OrgChartViewer';

const EmployeeDirectory: React.FC = () => {
  const { data: employees = [], isLoading, error } = useEmployeesData();

  // Check if the org_chart bucket exists and create it if it doesn't
  useEffect(() => {
    const initOrgChartStorage = async () => {
      try {
        // Try to get public URL, which will fail if bucket doesn't exist
        const { data } = await supabase.storage.getBucket('org_chart');
        if (!data) {
          console.log('Creating org_chart storage bucket');
          await supabase.storage.createBucket('org_chart', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
        }
      } catch (error) {
        console.log('Initializing org_chart storage bucket...');
        try {
          await supabase.storage.createBucket('org_chart', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
        } catch (err) {
          console.error('Error creating org_chart bucket:', err);
        }
      }
    };

    initOrgChartStorage();
  }, []);

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
