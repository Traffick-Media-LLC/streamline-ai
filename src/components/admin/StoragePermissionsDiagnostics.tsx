
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Check, Info, RefreshCw, Settings2, FileText, ShieldAlert } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ensureBucketAccess, BUCKET_ID } from "@/utils/storage/ensureBucketAccess";

const StoragePermissionsDiagnostics: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [bucketStatus, setBucketStatus] = useState<any>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  
  // Check bucket access on component mount
  useEffect(() => {
    checkBucketAccess();
    fetchStoragePolicies();
  }, []);
  
  const checkBucketAccess = async () => {
    setLoading(true);
    try {
      const result = await ensureBucketAccess(user?.id);
      setBucketStatus(result);
    } catch (err) {
      console.error("Error checking bucket access:", err);
      setBucketStatus({
        success: false,
        message: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStoragePolicies = async () => {
    setPoliciesLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_storage_policies', { bucket_name: BUCKET_ID });
        
      if (error) {
        console.error("Error fetching policies:", error);
      } else {
        setPolicies(data || []);
      }
    } catch (err) {
      console.error("Error in fetchStoragePolicies:", err);
    } finally {
      setPoliciesLoading(false);
    }
  };
  
  const setupStoragePolicies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .functions.invoke('storage_setup', {
          body: { bucket_id: BUCKET_ID }
        });
        
      if (error) {
        console.error("Error setting up storage:", error);
        toast.error("Failed to set up storage policies");
        setBucketStatus({
          success: false,
          message: error.message
        });
      } else {
        toast.success("Storage policies configured successfully");
        setBucketStatus({
          success: true,
          message: "Storage setup completed successfully"
        });
        fetchStoragePolicies();
        checkBucketAccess();
      }
    } catch (err) {
      console.error("Exception in setupStoragePolicies:", err);
      toast.error("An error occurred during storage setup");
      setBucketStatus({
        success: false,
        message: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Storage Permissions Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="status">
            <TabsList className="mb-4">
              <TabsTrigger value="status">Access Status</TabsTrigger>
              <TabsTrigger value="policies">Storage Policies</TabsTrigger>
              <TabsTrigger value="setup">Setup Storage</TabsTrigger>
            </TabsList>
            
            <TabsContent value="status">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/20">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Checking storage access...</span>
                  </div>
                ) : bucketStatus?.success ? (
                  <Alert className="bg-green-50 border-green-200">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-700">Storage Access Confirmed</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="mt-2 mb-1">You have access to upload files to the {BUCKET_ID} bucket.</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={checkBucketAccess} 
                        disabled={loading}
                        className="mt-2 border-green-200 text-green-700"
                      >
                        Verify Again
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Storage Access Failed</AlertTitle>
                    <AlertDescription>
                      <p className="mb-4">
                        {bucketStatus?.message || "Could not access storage bucket."}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={checkBucketAccess} 
                          disabled={loading}
                          variant="outline"
                          size="sm"
                        >
                          {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                          Check Again
                        </Button>
                        
                        <Button 
                          onClick={setupStoragePolicies}
                          disabled={loading || !isAdmin}
                          size="sm"
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Setup Storage
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Storage Bucket Information</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1 mt-2">
                      <p><span className="font-medium">Bucket:</span> {BUCKET_ID}</p>
                      <p><span className="font-medium">User ID:</span> {user?.id || 'Not authenticated'}</p>
                      <p><span className="font-medium">Admin:</span> {isAdmin ? 'Yes' : 'No'}</p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
            
            <TabsContent value="policies">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium">Storage Policies for {BUCKET_ID}</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchStoragePolicies}
                    disabled={policiesLoading}
                  >
                    {policiesLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">Refresh</span>
                  </Button>
                </div>
                
                {policiesLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="h-6 w-6 animate-spin opacity-70" />
                  </div>
                ) : policies.length === 0 ? (
                  <div className="text-center p-8 border rounded bg-muted/10">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-muted-foreground">No policies found for this bucket</p>
                    <Button 
                      onClick={setupStoragePolicies}
                      className="mt-4"
                      size="sm"
                      disabled={loading || !isAdmin}
                    >
                      <Settings2 className="h-4 w-4 mr-2" />
                      Configure Storage Policies
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left text-sm font-medium">Policy Name</th>
                          <th className="p-2 text-left text-sm font-medium">Action</th>
                          <th className="p-2 text-left text-sm font-medium">Command</th>
                        </tr>
                      </thead>
                      <tbody>
                        {policies.map((policy, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-muted/10' : ''}>
                            <td className="p-2 text-sm">{policy.name}</td>
                            <td className="p-2 text-sm">{policy.action}</td>
                            <td className="p-2 text-sm font-mono text-xs">{policy.command}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {policies.length > 0 && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <p className="mb-1">These policies determine who can access files in the {BUCKET_ID} bucket.</p>
                      <p>Only administrators can view RLS policy definitions.</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="setup">
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Storage Setup</AlertTitle>
                  <AlertDescription>
                    <p className="mb-4">
                      This utility will set up the necessary storage bucket and RLS policies for the organization chart feature.
                    </p>
                    <p className="mb-4 text-sm">
                      You need admin privileges to perform this operation.
                    </p>
                    
                    <Button 
                      onClick={setupStoragePolicies} 
                      disabled={loading || !isAdmin}
                      className="flex items-center gap-2"
                    >
                      {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                      {loading ? "Setting up storage..." : "Setup Storage"}
                    </Button>
                  </AlertDescription>
                </Alert>
                
                {!isAdmin && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Admin Access Required</AlertTitle>
                    <AlertDescription>
                      You need administrator privileges to setup storage policies.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoragePermissionsDiagnostics;
