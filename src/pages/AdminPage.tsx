
import React, { useEffect, useState } from 'react';
import AdminDashboard from '../components/admin/AdminDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { logEvent, generateRequestId } from '@/utils/logging';
import { checkAdminPermissions, PermissionCheckResult } from '@/utils/admin/checkAdminPermissions';

const AdminPage: React.FC = () => {
  const { isAdmin, isAuthenticated, user } = useAuth();
  const [permissionCheckResult, setPermissionCheckResult] = useState<PermissionCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const verifyPermissions = async () => {
      if (!user?.id) return;
      
      setIsChecking(true);
      
      // Log page access
      await logEvent({
        requestId: generateRequestId(),
        userId: user?.id,
        eventType: 'admin_page_access',
        component: 'AdminPage',
        message: `Admin page accessed by user: ${isAdmin ? 'Admin' : 'Non-Admin'}`,
        metadata: {
          isAuthenticated,
          isAdmin,
          userId: user?.id
        },
        severity: 'info',
        category: 'auth'
      });
      
      // Verify admin permissions directly
      const result = await checkAdminPermissions(user.id);
      setPermissionCheckResult(result);
      setIsChecking(false);
    };
    
    verifyPermissions();
  }, [user?.id, isAdmin, isAuthenticated]);
  
  const showPermissionDiagnostics = process.env.NODE_ENV !== 'production' || 
                                   (permissionCheckResult && !permissionCheckResult.success);

  return (
    <>
      {showPermissionDiagnostics && (
        <div className="container mx-auto px-4 py-4">
          <Alert className={`mb-4 ${!isAdmin || !permissionCheckResult?.isAdmin ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2">
              {isChecking ? (
                <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-blue-500 animate-spin"></div>
              ) : !isAdmin || !permissionCheckResult?.isAdmin ? (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              <AlertTitle className={!isAdmin || !permissionCheckResult?.isAdmin ? "text-yellow-700" : "text-green-700"}>
                Admin Permission Diagnostics
              </AlertTitle>
            </div>
            
            <AlertDescription className="mt-2 text-sm">
              <div className="font-mono space-y-1 p-3 bg-white bg-opacity-50 rounded border border-gray-200 text-gray-700">
                <p>Auth Context Admin: {isAdmin ? '✅ Yes' : '❌ No'}</p>
                <p>Direct Check Admin: {permissionCheckResult?.isAdmin ? '✅ Yes' : '❌ No'}</p>
                <p>Authentication Valid: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
                <p>User ID: {user?.id || 'Not logged in'}</p>
                {permissionCheckResult?.details && (
                  <p>Details: {JSON.stringify(permissionCheckResult.details)}</p>
                )}
                {permissionCheckResult?.error && (
                  <p className="text-red-500">
                    Error: {permissionCheckResult.error.message || JSON.stringify(permissionCheckResult.error)}
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <AdminDashboard />
    </>
  );
};

export default AdminPage;
