
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, Database, FolderOpen, RefreshCw, Shield, Calendar, FileText, AlertTriangle, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BUCKET_ID } from "@/utils/storage/ensureBucketAccess";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";

// Updated interface to match Supabase Bucket type
interface BucketInfo {
  id: string;
  name: string;
  owner: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  file_size_limit?: number | null; // Made optional to match Supabase Bucket type
}

// Updated FileInfo interface with proper types that don't rely on external FileObject
interface FileInfo {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>; // Using generic Record type instead
}

const StorageBucketInfo: React.FC = () => {
  const [bucketInfo, setBucketInfo] = useState<BucketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    userId: string | null;
    role: string | null;
  }>({ authenticated: false, userId: null, role: null });
  
  const checkAuthStatus = async () => {
    try {
      // Check if we have a current session
      const { data: sessionData } = await supabase.auth.getSession();
      const isAuthenticated = !!sessionData.session?.user;
      const userId = sessionData.session?.user?.id || null;
      
      // Check admin role if authenticated
      let role = null;
      if (isAuthenticated && userId) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();
          
        role = roleData?.role || null;
      }
      
      setAuthStatus({
        authenticated: isAuthenticated,
        userId,
        role
      });
      
      return isAuthenticated;
    } catch (err) {
      console.error("Auth check error:", err);
      return false;
    }
  };
  
  const fetchBucketInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First check authentication status
      const isAuthenticated = await checkAuthStatus();
      
      if (!isAuthenticated) {
        setError("You are not authenticated. Please log in to view bucket info.");
        setBucketInfo(null);
        setLoading(false);
        return;
      }
      
      // Get bucket information
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(BUCKET_ID);
      
      if (bucketError) {
        setError(`Error fetching bucket: ${bucketError.message}`);
        setBucketInfo(null);
      } else {
        setBucketInfo(bucketData);
        
        // List files in the bucket
        const { data: fileData, error: fileError } = await supabase.storage
          .from(BUCKET_ID)
          .list();
          
        if (fileError) {
          setError(`Error listing files: ${fileError.message}`);
        } else {
          // Transform the file data to match our FileInfo interface
          const transformedFiles = fileData?.map(file => ({
            ...file,
            metadata: file.metadata || {}
          })) || [];
          setFiles(transformedFiles);
        }
        
        // Try to get storage policies directly (avoiding the _rls_policies table)
        try {
          // Use storage.getBucket instead - we'll just use the public property from bucketInfo
          // Skip querying non-existent _rls_policies table
          console.log('Bucket is public:', bucketData?.public);
          
          // Set a simple policy description based on bucket public status
          const simplePolicies = bucketData?.public ? 
            [{ name: 'Public bucket - anyone can access files' }] : 
            [{ name: 'Private bucket - requires authentication' }];
          
          setPolicies(simplePolicies);
        } catch (policyErr) {
          console.log('Could not fetch policies, likely not an admin');
        }
      }
    } catch (err) {
      setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchBucketInfo();
  }, []);

  const handleFileDelete = async (fileName: string) => {
    try {
      if (!authStatus.authenticated) {
        toast.error("You must be logged in to delete files");
        return;
      }
      
      const { error } = await supabase.storage.from(BUCKET_ID).remove([fileName]);
      if (error) {
        toast.error(`Failed to delete file: ${error.message}`);
      } else {
        toast.success(`File ${fileName} deleted successfully`);
        fetchBucketInfo(); // Refresh the list
      }
    } catch (err) {
      toast.error(`Error deleting file: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  const getMimeTypeIcon = (fileName: string) => {
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return "🖼️";
    } else if (fileName.match(/\.(pdf)$/i)) {
      return "📄";
    } else if (fileName.match(/\.(doc|docx|txt|md)$/i)) {
      return "📝";
    }
    return "📁";
  };
  
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Storage Bucket Information
          </CardTitle>
          <CardDescription>
            View details and files for the {BUCKET_ID} bucket
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={fetchBucketInfo} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {/* Authentication Status */}
        <Alert variant={authStatus.authenticated ? "default" : "destructive"} className="mb-4">
          <User className="h-4 w-4" />
          <AlertTitle>Authentication Status</AlertTitle>
          <AlertDescription>
            <div className="space-y-1 mt-2 text-sm">
              <div><strong>Status:</strong> {authStatus.authenticated ? 'Authenticated' : 'Not Authenticated'}</div>
              {authStatus.userId && <div><strong>User ID:</strong> {authStatus.userId}</div>}
              {authStatus.role && <div><strong>Role:</strong> {authStatus.role}</div>}
              {!authStatus.authenticated && (
                <div className="mt-2 text-red-500">
                  You need to be authenticated to access bucket information and perform operations.
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={fetchBucketInfo}>
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {bucketInfo ? (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Bucket Details</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2 text-sm">
                  <div><strong>ID:</strong> {bucketInfo.id}</div>
                  <div><strong>Name:</strong> {bucketInfo.name}</div>
                  <div><strong>Public:</strong> {bucketInfo.public ? 
                    <Badge variant="secondary">Yes</Badge> : 
                    <Badge variant="outline">No</Badge>}
                  </div>
                  <div><strong>Created:</strong> {new Date(bucketInfo.created_at).toLocaleString()}</div>
                  <div><strong>Size Limit:</strong> {bucketInfo.file_size_limit ? `${(bucketInfo.file_size_limit / 1024 / 1024).toFixed(1)} MB` : 'No limit'}</div>
                </div>
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>Files ({files.length})</AlertTitle>
              <AlertDescription>
                <div className="max-h-60 overflow-y-auto mt-2 border rounded-md">
                  {files.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      No files found in this bucket
                    </div>
                  ) : (
                    <div className="divide-y">
                      {files.map((file, index) => (
                        <div key={index} className="p-2 hover:bg-muted/50 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span>{getMimeTypeIcon(file.name)}</span>
                            <div>
                              <div className="font-medium">{file.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(file.metadata?.size)}
                                {file.updated_at && (
                                  <> • Updated {new Date(file.updated_at).toLocaleDateString()}</>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                const url = supabase.storage.from(BUCKET_ID).getPublicUrl(file.name).data.publicUrl;
                                window.open(url, '_blank');
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleFileDelete(file.name)}
                              disabled={!authStatus.authenticated || authStatus.role !== 'admin'}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {policies && policies.length > 0 && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Access Policies</AlertTitle>
                <AlertDescription>
                  <div className="mt-2">
                    <p className="text-sm mb-2">This bucket has {policies.length} access policies:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {policies.map((policy, index) => (
                        <li key={index}>{policy.name || `Policy ${index + 1}`}</li>
                      ))}
                    </ul>
                    <p className="text-sm mt-2 text-muted-foreground">
                      Note: After our SQL update, we now have simplified RLS policies:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      <li>Public can view org_chart files</li>
                      <li>Authenticated users can upload to org_chart</li>
                      <li>Admins can manage org_chart files</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
                <div className="text-muted-foreground">Loading bucket information...</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-muted-foreground text-lg">
                  {error ? 'Failed to load bucket information' : `Bucket "${BUCKET_ID}" not found`}
                </div>
                <Button onClick={fetchBucketInfo}>
                  Retry
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return 'Unknown size';
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default StorageBucketInfo;
