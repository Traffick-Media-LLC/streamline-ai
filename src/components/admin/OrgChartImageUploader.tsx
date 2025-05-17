
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Upload, Trash2, Image, RefreshCw, Lock, FileText, Info, AlertCircle } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { useAuth } from "@/contexts/AuthContext";
import { logEvent, generateRequestId } from "@/utils/logging";
import { ensureBucketAccess, BUCKET_ID } from "@/utils/storage/ensureBucketAccess";

const OrgChartImageUploader: React.FC = () => {
  const { imageSettings, isLoading, error, uploadImage, removeImage, isUploading, isRemoving } = useOrgChartImage();
  const { isAdmin, isAuthenticated, user, session } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bucketStatus, setBucketStatus] = useState<{ success: boolean; message?: string } | null>(null);
  const [checkingBucket, setCheckingBucket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionDebugInfo, setSessionDebugInfo] = useState<string | null>(null);
  const componentRequestId = generateRequestId();

  // Check bucket access on component mount
  useEffect(() => {
    const checkBucketAccess = async () => {
      if (!user?.id) return;
      
      setCheckingBucket(true);
      try {
        const result = await ensureBucketAccess(user.id);
        setBucketStatus(result);
      } catch (err) {
        console.error("Error checking bucket access:", err);
        setBucketStatus({
          success: false,
          message: `Error checking bucket: ${err instanceof Error ? err.message : String(err)}`
        });
      } finally {
        setCheckingBucket(false);
      }
    };
    
    checkBucketAccess();
  }, [user?.id]);
  
  // Log component mount with auth state
  useEffect(() => {
    const logInitialState = async () => {
      logEvent({
        requestId: componentRequestId,
        userId: user?.id,
        eventType: 'uploader_mounted',
        component: 'OrgChartImageUploader',
        message: 'Org chart uploader component mounted'
      });

      // Generate debug info for troubleshooting
      const authDebugInfo = [
        `Authenticated: ${isAuthenticated}`,
        `Admin: ${isAdmin}`,
        `User ID: ${user?.id || 'none'}`,
        `Session Valid: ${!!session}`,
        session ? `Session Expires: ${new Date(session.expires_at * 1000).toLocaleString()}` : '',
        `Bucket: ${BUCKET_ID}`,
      ].filter(Boolean).join('\n');

      setSessionDebugInfo(authDebugInfo);
    };

    logInitialState();
  }, [isAdmin, isAuthenticated, user, session, componentRequestId]);

  // Check authentication status
  const isUserAuthenticated = !!session && isAuthenticated;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    
    // Check if the file is an image or PDF
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error("Please select an image file or PDF document");
      setSelectedFile(null);
      return;
    }

    // Check if the file is not too large (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10MB)");
      setSelectedFile(null);
      return;
    }

    logEvent({
      requestId: componentRequestId,
      userId: user?.id,
      eventType: 'file_selected',
      component: 'OrgChartImageUploader',
      message: 'File selected for upload'
    });

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    if (!isUserAuthenticated) {
      toast.error("You must be logged in to upload files");
      return;
    }
    
    // Check bucket access before uploading
    if (!bucketStatus?.success) {
      try {
        const result = await ensureBucketAccess(user?.id);
        setBucketStatus(result);
        
        if (!result.success) {
          toast.error("Storage access error: " + (result.message || "Cannot access storage"));
          return;
        }
      } catch (err) {
        toast.error("Storage access error");
        return;
      }
    }

    logEvent({
      requestId: componentRequestId,
      userId: user?.id,
      eventType: 'upload_initiated',
      component: 'OrgChartImageUploader',
      message: 'User initiated upload'
    });

    try {
      uploadImage(selectedFile);
      setSelectedFile(null);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error("Error initiating upload:", error);
      toast.error("Upload failed: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleRemove = () => {
    if (!isUserAuthenticated) {
      toast.error("You must be logged in to remove files");
      return;
    }
    removeImage();
  };
  
  const retryBucketCheck = async () => {
    if (!user?.id) {
      toast.error("You must be logged in to check storage access");
      return;
    }
    
    setCheckingBucket(true);
    setBucketStatus(null);
    
    try {
      const result = await ensureBucketAccess(user.id);
      setBucketStatus(result);
      
      if (result.success) {
        toast.success("Storage access verified successfully");
      } else {
        toast.error("Storage access check failed: " + (result.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error checking bucket access:", err);
      setBucketStatus({
        success: false,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`
      });
      toast.error("Error checking storage access");
    } finally {
      setCheckingBucket(false);
    }
  };

  // If user is not an admin, show a permissions error
  if (!isAuthenticated || !isAdmin) {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Admin Access Required</AlertTitle>
        <AlertDescription>
          You need administrator privileges to manage the organization chart.
          {imageSettings?.url && (
            <div className="mt-4">
              {imageSettings.fileType === 'pdf' ? (
                <div className="border rounded-md p-4 bg-muted/30 flex flex-col items-center justify-center">
                  <FileText className="h-12 w-12 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">PDF Organization Chart (click to view)</p>
                </div>
              ) : (
                <img 
                  src={imageSettings.url} 
                  alt="Current Organization Chart" 
                  className="w-full max-h-[400px] object-contain border rounded-md mt-2" 
                />
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Show component errors
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Error loading organization chart: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  // Show bucket access errors
  if (bucketStatus && !bucketStatus.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> 
            Storage Access Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Storage Permission Error</AlertTitle>
            <AlertDescription>
              <p className="mb-4">{bucketStatus.message || "Cannot access the storage bucket"}</p>
              <p className="mb-4">This might be due to missing Row-Level Security (RLS) policies for the storage bucket.</p>
              <Button onClick={retryBucketCheck} disabled={checkingBucket}>
                {checkingBucket ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
          
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Technical Information</AlertTitle>
            <AlertDescription className="text-xs">
              <div className="space-y-1 mt-2">
                <p>User ID: {user?.id || 'Not authenticated'}</p>
                <p>Admin Status: {isAdmin ? 'Confirmed' : 'Not Admin'}</p>
                <p>Session Valid: {isUserAuthenticated ? 'Yes' : 'No'}</p>
                <p>Bucket ID: {BUCKET_ID}</p>
                <p>Component Request ID: {componentRequestId}</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Display authentication status */}
      {!isUserAuthenticated && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Authentication Warning</AlertTitle>
          <AlertDescription className="text-yellow-700">
            You appear to be logged in as an admin, but your authentication session may have issues.
            Try signing out and back in if you encounter upload errors.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Storage status */}
      <Alert className={bucketStatus?.success ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}>
        <Info className={`h-4 w-4 ${bucketStatus?.success ? "text-green-600" : "text-blue-600"}`} />
        <AlertTitle className={bucketStatus?.success ? "text-green-600" : "text-blue-600"}>
          {checkingBucket ? "Checking Storage Access..." : 
           bucketStatus?.success ? "Storage Access Confirmed" : 
           "Storage Access Status"}
        </AlertTitle>
        <AlertDescription>
          {checkingBucket ? (
            <div className="flex items-center gap-2 mt-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Verifying access to the {BUCKET_ID} bucket...</span>
            </div>
          ) : bucketStatus?.success ? (
            <div className="text-green-700 mt-2">
              You have access to upload files to the {BUCKET_ID} bucket.
            </div>
          ) : (
            <div className="flex justify-between items-center mt-2">
              <span className="text-blue-700">
                Click to check storage access status
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retryBucketCheck} 
                disabled={checkingBucket}
                className="border-blue-200 text-blue-700"
              >
                Check Access
              </Button>
            </div>
          )}
        </AlertDescription>
      </Alert>
      
      {/* File upload section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Organization Chart
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <div className="flex items-end gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploading || checkingBucket}
                  ref={fileInputRef}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading || !bucketStatus?.success || !isUserAuthenticated}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs mt-1 text-muted-foreground">
                Accepted formats: PNG, JPEG image or PDF document (max 10MB)
              </p>
            </div>

            {/* Current file section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Current Organization Chart</h3>
                {imageSettings?.url && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemove}
                    disabled={isRemoving || !isUserAuthenticated}
                    className="flex items-center gap-2"
                  >
                    {isRemoving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
              
              {isLoading ? (
                <div className="h-[400px] w-full bg-muted animate-pulse rounded flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
                </div>
              ) : imageSettings?.url ? (
                <div className="border rounded-md overflow-hidden">
                  {imageSettings.fileType === 'pdf' ? (
                    <div className="h-[400px] bg-muted/10 flex flex-col items-center justify-center p-4">
                      <FileText className="h-16 w-16 mb-3 opacity-50" />
                      <p className="text-muted-foreground mb-4">PDF Organization Chart</p>
                      <a 
                        href={imageSettings.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Open PDF
                      </a>
                    </div>
                  ) : (
                    <img 
                      src={imageSettings.url} 
                      alt="Organization Chart" 
                      className="w-full max-h-[600px] object-contain bg-muted"
                    />
                  )}
                  <div className="p-2 bg-muted text-xs text-muted-foreground">
                    Updated: {imageSettings.updated_at ? new Date(imageSettings.updated_at).toLocaleString() : 'N/A'}
                    {imageSettings.fileType === 'pdf' && " • PDF document"}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] border rounded-md flex items-center justify-center bg-muted/30 text-muted-foreground flex-col gap-2">
                  <Image className="h-10 w-10 opacity-20" />
                  <p>No organization chart uploaded</p>
                </div>
              )}
            </div>
            
            {/* Technical info for admins */}
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Technical Information</AlertTitle>
              <AlertDescription className="text-xs">
                <div className="space-y-1 mt-2">
                  <p>User ID: {user?.id || 'Not authenticated'}</p>
                  <p>Admin Status: {isAdmin ? 'Confirmed' : 'Not Admin'}</p>
                  <p>Session Valid: {isUserAuthenticated ? 'Yes' : 'No'}</p>
                  <p>Bucket ID: {BUCKET_ID}</p>
                  <p>Component Request ID: {componentRequestId}</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgChartImageUploader;
