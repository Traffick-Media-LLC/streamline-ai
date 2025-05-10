
import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Upload, Trash2, Image, RefreshCw, Lock, FileText } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { useAuth } from "@/contexts/AuthContext";

const OrgChartImageUploader: React.FC = () => {
  const { imageSettings, isLoading, error, uploadImage, removeImage, isUploading, isRemoving } = useOrgChartImage();
  const { isAdmin, isAuthenticated } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    uploadImage(selectedFile);
    setSelectedFile(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
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
                  disabled={!selectedFile || isUploading}
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
                    variant="outline"
                    size="sm"
                    onClick={handleRemove}
                    disabled={isRemoving}
                    className="flex items-center gap-2 text-destructive"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrgChartImageUploader;
