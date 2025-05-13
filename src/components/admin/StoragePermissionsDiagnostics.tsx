
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ensureBucketAccess } from "@/utils/storage/ensureBucketAccess";

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
  bucketAccess: {
    success: boolean;
    error?: any;
    message?: string;
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
      
      // Combine results
      setResults({
        timestamp: new Date().toISOString(),
        user: user ? { id: user.id, email: user.email } : null,
        adminStatus: adminResults,
        bucketAccess: bucketAccessResult,
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
                    : `Storage access failed: ${results.bucketAccess?.message || "Unknown error"}`}
                </AlertDescription>
              </Alert>
              
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
