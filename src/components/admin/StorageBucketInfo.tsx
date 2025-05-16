
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Info, Database, FolderOpen, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUCKET_ID } from "@/utils/storage/ensureBucketAccess";

// Updated interface to match Supabase Bucket type
interface BucketInfo {
  id: string;
  name: string;
  owner: string;
  public: boolean;
  created_at: string;
  updated_at: string;
  file_size_limit?: number | null; // Changed to optional to match Supabase Bucket type
}

const StorageBucketInfo: React.FC = () => {
  const [bucketInfo, setBucketInfo] = useState<BucketInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
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
          setFiles(fileData || []);
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
  
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Storage Bucket Information
          </CardTitle>
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {bucketInfo ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Bucket Details</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2 text-sm">
                  <div><strong>ID:</strong> {bucketInfo.id}</div>
                  <div><strong>Name:</strong> {bucketInfo.name}</div>
                  <div><strong>Public:</strong> {bucketInfo.public ? 'Yes' : 'No'}</div>
                  <div><strong>Created:</strong> {new Date(bucketInfo.created_at).toLocaleString()}</div>
                  <div><strong>Size Limit:</strong> {bucketInfo.file_size_limit ? `${(bucketInfo.file_size_limit / 1024 / 1024).toFixed(1)} MB` : 'No limit'}</div>
                </div>
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Database className="h-4 w-4" />
              <AlertTitle>Files ({files.length})</AlertTitle>
              <AlertDescription>
                <div className="max-h-40 overflow-y-auto mt-2">
                  {files.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No files found in this bucket</div>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {files.map((file, index) => (
                        <li key={index}>{file.name} ({formatFileSize(file.metadata?.size)})</li>
                      ))}
                    </ul>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-4">
            {loading ? (
              <div className="flex justify-center">
                <RefreshCw className="h-8 w-8 animate-spin opacity-50" />
              </div>
            ) : (
              <div className="text-muted-foreground">
                {error ? 'Failed to load bucket information' : `Bucket "${BUCKET_ID}" not found`}
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
