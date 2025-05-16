
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, AlertCircle, Info, Database } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ensureBucketAccess, BucketAccessResult } from "@/utils/storage/ensureBucketAccess";

// Define proper types for the admin results object
interface AdminCheckResults {
  isAdmin: boolean;
  rpcError?: string;
  rpcAdminCheck?: boolean;
}

interface DiagnosticsResults {
  timestamp: string;
  user: { id: string; email: string } | null;
  adminStatus: AdminCheckResults;
  bucketAccess: BucketAccessResult;
  databaseFunctions?: {
    success: boolean;
    message?: string;
    error?: any;
  };
}

const StoragePermissionsDiagnostics: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiagnosticsResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin, isAuthenticated, user } = useAuth();
  
  const runDiagnostics = async () => {
    if (!isAuthenticated) {
      toast.error("You must be logged in to run diagnostics");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Check admin status
      const adminResults: AdminCheckResults = { isAdmin };
      
      // Step 2: Verify admin with RPC call
      const { data: adminCheck, error: adminError } = await supabase.rpc('is_admin');
      
      if (adminError) {
        adminResults.rpcError = adminError.message;
      } else {
        adminResults.rpcAdminCheck = adminCheck;
      }
      
      // Step 3: Check bucket access
      const bucketAccessResult = await ensureBucketAccess(user?.id);
      
      // Step 4: Test database function access
      let databaseFunctionResult = { success: false };
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user?.id)
          .maybeSingle();
          
        if (roleError) {
          databaseFunctionResult = {
            success: false,
            error: roleError,
            message: `Error accessing user_roles: ${roleError.message}`
          };
        } else {
          databaseFunctionResult = {
            success: true,
            message: `Successfully queried user_roles table. Role: ${roleData?.role || 'none'}`
          };
        }
      } catch (dbError) {
        databaseFunctionResult = {
          success: false,
          error: dbError,
          message: `Exception accessing database: ${dbError instanceof Error ? dbError.message : String(dbError)}`
        };
      }
      
      // Combine results
      setResults({
        timestamp: new Date().toISOString(),
        user: user ? { id: user.id, email: user.email } : null,
        adminStatus: adminResults,
        bucketAccess: bucketAccessResult,
        databaseFunctions: databaseFunctionResult
      });
      
      if (bucketAccessResult.success) {
        toast.success("Storage access verified successfully");
      } else {
        setError("Storage access test failed. See details below.");
        toast.error("Storage access test failed");
      }
    } catch (err) {
      console.error("Diagnostics error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      toast.error("Error running diagnostics");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Permissions Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm">
              Run diagnostics to check storage permissions and admin status
            </p>
            <Button onClick={runDiagnostics} disabled={loading} size="sm">
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Run Diagnostics
            </Button>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {results && (
            <div className="space-y-3">
              <Alert variant={results.bucketAccess?.success ? "default" : "destructive"}>
                {results.bucketAccess?.success 
                  ? <CheckCircle className="h-4 w-4 text-green-500" /> 
                  : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>
                  {results.bucketAccess?.success 
                    ? "Storage Access Test: Passed" 
                    : "Storage Access Test: Failed"}
                </AlertTitle>
                <AlertDescription>
                  {results.bucketAccess?.success 
                    ? "Your account has proper access to the storage buckets." 
                    : `Storage access failed: ${results.bucketAccess?.error?.message || results.bucketAccess?.message || "Unknown error"}`}
                    
                  {!results.bucketAccess?.success && results.bucketAccess?.error?.details && (
                    <div className="mt-2 text-xs p-2 bg-red-50 rounded border border-red-100 whitespace-pre-wrap font-mono">
                      {JSON.stringify(results.bucketAccess.error.details, null, 2)}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
              
              {results.databaseFunctions && (
                <Alert variant={results.databaseFunctions.success ? "default" : "destructive"}>
                  <Database className="h-4 w-4" />
                  <AlertTitle>Database Function Test</AlertTitle>
                  <AlertDescription>
                    {results.databaseFunctions.message}
                    
                    {!results.databaseFunctions.success && results.databaseFunctions.error && (
                      <div className="mt-2 text-xs p-2 bg-red-50 rounded border border-red-100 whitespace-pre-wrap font-mono">
                        {JSON.stringify(results.databaseFunctions.error, null, 2)}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Admin Status</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1 mt-2 text-sm">
                    <div>Client-side admin: {results.adminStatus.isAdmin ? "Yes" : "No"}</div>
                    <div>Database admin check: {
                      results.adminStatus.rpcError 
                        ? `Error: ${results.adminStatus.rpcError}` 
                        : results.adminStatus.rpcAdminCheck ? "Yes" : "No"
                    }</div>
                    <div>User ID: {results.user?.id || "Not logged in"}</div>
                    <div>Timestamp: {new Date(results.timestamp).toLocaleString()}</div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StoragePermissionsDiagnostics;
