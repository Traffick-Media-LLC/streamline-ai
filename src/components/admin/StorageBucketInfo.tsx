
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, Database, FolderOpen, RefreshCw, Shield, Calendar, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BUCKET_ID } from "@/utils/storage/ensureBucketAccess";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { FileObject } from '@supabase/storage-js';

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

// Updated to match the structure from Supabase's FileObject
interface FileInfo {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, any>; // Changed to match FileObject's metadata type
}

const StorageBucketInfo: React.FC = () => {
  const [bucketInfo, setBucketInfo] = useState<BucketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  
  const fetchBucketInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
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
          // Transform FileObject[] to FileInfo[] to match our interface
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
        {error && (
          <Alert variant="destructive" className="mb-4">
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
