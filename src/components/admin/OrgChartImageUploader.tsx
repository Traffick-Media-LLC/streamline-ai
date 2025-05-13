import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Upload, Trash2, Image, RefreshCw, Lock, FileText, Info, AlertCircle } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { useAuth } from "@/contexts/AuthContext";
import { logEvent, generateRequestId } from "@/utils/logging";
import { supabase } from "@/integrations/supabase/client";

const OrgChartImageUploader: React.FC = () => {
  const { imageSettings, isLoading, error, uploadImage, removeImage, isUploading, isRemoving } = useOrgChartImage();
  const { isAdmin, isAuthenticated, user, session } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sessionDebugInfo, setSessionDebugInfo] = useState<string | null>(null);
  const componentRequestId = generateRequestId();

  // Log component mount with auth state
  useEffect(() => {
    const logInitialState = async () => {
      await logEvent({
        requestId: componentRequestId,
        userId: user?.id,
        eventType: 'uploader_mounted',
        component: 'OrgChartImageUploader',
        message: 'Org chart uploader component mounted',
        metadata: {
          isAuthenticated,
          isAdmin,
          hasUser: !!user,
          hasSession: !!session,
          userDetails: user ? {
            id: user.id,
            email: user.email,
            metadata: user.user_metadata
          } : null,
          sessionDetails: session ? {
            expiresAt: new Date(session.expires_at * 1000).toISOString(),
          } : null
        },
        severity: 'info'
      });

      // Generate debug info for troubleshooting
      const authDebugInfo = [
        `Authenticated: ${isAuthenticated}`,
        `Admin: ${isAdmin}`,
        `User ID: ${user?.id || 'none'}`,
        `Session Valid: ${!!session}`,
        session ? `Session Expires: ${new Date(session.expires_at * 1000).toLocaleString()}` : '',
      ].filter(Boolean).join('\n');

      setSessionDebugInfo(authDebugInfo);

      // Validate storage permissions directly
      if (user && session) {
        try {
          const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket('org_chart');
          
          if (bucketError) {
            console.error("Error getting bucket info:", bucketError);
            
            await logEvent({
              requestId: componentRequestId,
              userId: user?.id,
              eventType: 'bucket_access_check',
              component: 'OrgChartImageUploader',
              message: 'Error checking bucket access',
              metadata: { error: bucketError.message, errorMessage: bucketError.message },
              severity: 'warning'
            });
          } else {
            await logEvent({
              requestId: componentRequestId,
              userId: user?.id,
              eventType: 'bucket_access_success',
              component: 'OrgChartImageUploader',
              message: 'Successfully verified bucket access',
              metadata: { bucketInfo },
              severity: 'info'
            });
          }
        } catch (error) {
          console.error("Unexpected error checking bucket:", error);
        }
      }
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

    await logEvent({
      requestId: componentRequestId,
      userId: user?.id,
      eventType: 'file_selected',
      component: 'OrgChartImageUploader',
      message: 'File selected for upload',
      metadata: {
        fileType: file.type,
        fileSize: file.size,
        fileName: file.name
      },
      severity: 'info'
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

    await logEvent({
      requestId: componentRequestId,
      userId: user?.id,
      eventType: 'upload_initiated',
      component: 'OrgChartImageUploader',
      message: 'User initiated upload',
      metadata: {
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileName: selectedFile.name,
        isAdmin,
        isAuthenticated
      },
      severity: 'info'
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
    }
  };

  const handleRemove = () => {
    if (!isUserAuthenticated) {
      toast.error("You must be logged in to remove files");
      return;
    }
    removeImage();
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
      
      {/* Debug info section */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-600">Authentication Diagnostics</AlertTitle>
        <AlertDescription>
          <div className="font-mono text-xs text-blue-700 whitespace-pre-wrap mt-2 p-2 bg-blue-50 rounded border border-blue-100">
            {sessionDebugInfo || "Loading session information..."}
          </div>
        </AlertDescription>
      </Alert>

      {/* File upload section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Upload Organization Chart</label>
              <div className="flex items-end gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  ref={fileInputRef}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading || !isUserAuthenticated}
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
                  <p>Component Request ID: {componentRequestId}</p>
                  <p>Check console logs for detailed error information</p>
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
