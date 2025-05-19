
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoIcon, RefreshCw, ShieldAlert, ShieldCheck, FileLock2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET_ID } from "@/utils/storage/ensureBucketAccess";
import { useAuth } from "@/contexts/AuthContext";

interface StoragePolicy {
  name: string;
  action: string;
  definition: string;
  command: string;
}

const StorageBucketInfo = () => {
  const [policies, setPolicies] = useState<StoragePolicy[]>([]);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [bucketInfo, setBucketInfo] = useState<any>(null);
  const [bucketLoading, setBucketLoading] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchBucketInfo();
    fetchPolicies();
  }, []);

  const fetchBucketInfo = async () => {
    setBucketLoading(true);
    try {
      const { data, error } = await supabase.storage.getBucket(BUCKET_ID);
      
      if (error) {
        console.error("Error fetching bucket:", error);
        setBucketInfo(null);
      } else {
        setBucketInfo(data);
      }
    } catch (err) {
      console.error("Error in fetchBucketInfo:", err);
      setBucketInfo(null);
    } finally {
      setBucketLoading(false);
    }
  };

  const fetchPolicies = async () => {
    setPolicyLoading(true);
    try {
      // Fetch policies that apply to our bucket
      const { data, error } = await (supabase.rpc as any)('get_storage_policies', { bucket_name: BUCKET_ID });
      
      if (error) {
        console.error("Error fetching policies:", error);
        
        // Check if we have admin permission issue
        if (error.message && error.message.includes('permission denied')) {
          if (!isAdmin) {
            // For non-admins, show simplified policy information
            const simplePolicies = [
              {
                name: "Admins can manage org chart files",
                action: "ALL",
                definition: "Administrators can manage all files",
                command: "USING"
              },
              {
                name: "Public can view org chart files",
                action: "SELECT", 
                definition: "Anyone can view org chart files",
                command: "USING"
              }
            ];
            
            setPolicies(simplePolicies);
            return;
          }
        }
        
        // For other errors, provide a generic fallback
        setPolicies([]);
      } else {
        setPolicies(data || []);
      }
    } catch (err) {
      console.error("Error in fetchPolicies:", err);
      // Ensure we always set an array even on error
      setPolicies([]);
    } finally {
      setPolicyLoading(false);
    }
  };

  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'SELECT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'INSERT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ALL':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const refreshInfo = () => {
    fetchBucketInfo();
    fetchPolicies();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileLock2 className="h-5 w-5" />
            <span>Storage Bucket Information</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshInfo}
            disabled={bucketLoading || policyLoading}
          >
            {(bucketLoading || policyLoading) ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1">Refresh</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bucket Details */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Bucket Details</h3>
          {bucketLoading ? (
            <div className="h-12 bg-muted animate-pulse rounded" />
          ) : bucketInfo ? (
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="text-sm"><span className="font-medium">ID:</span> {bucketInfo.id}</div>
                <div className="text-sm ml-4"><span className="font-medium">Public:</span> {bucketInfo.public ? 'Yes' : 'No'}</div>
                <div className="text-sm ml-4">
                  <span className="font-medium">File Size Limit:</span> {bucketInfo.file_size_limit ? `${bucketInfo.file_size_limit / 1024 / 1024}MB` : 'None'}
                </div>
              </div>
              
              {bucketInfo.public && (
                <Alert variant="default" className="mt-2 bg-blue-50 border-blue-100">
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    This bucket is public, which means anyone can view files without authentication, but only admins can upload and manage files.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Could not retrieve bucket information. Check Supabase connection.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Security Policies */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Security Policies</h3>
          
          {policyLoading ? (
            <div className="h-32 bg-muted animate-pulse rounded" />
          ) : policies.length > 0 ? (
            <div className="space-y-4">
              {policies.map((policy, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex items-start justify-between">
                    <div className="font-medium">{policy.name}</div>
                    <Badge className={`${getBadgeColor(policy.action)}`}>
                      {policy.action}
                    </Badge>
                  </div>
                  <div className="text-sm mt-2 text-muted-foreground">
                    {policy.definition.includes('is_admin()') ? 
                      'Requires admin role for access' : 
                      policy.definition}
                  </div>
                  <div className="text-xs mt-2 text-muted-foreground">
                    {policy.command} policy
                  </div>
                </div>
              ))}
              
              <Alert variant="default" className="bg-green-50 border-green-100">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Storage policies are properly configured. Only administrators can upload and manage files, while everyone can view them.
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                No storage policies found for this bucket. This could mean either you don't have permission to view policies or they haven't been configured.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageBucketInfo;
