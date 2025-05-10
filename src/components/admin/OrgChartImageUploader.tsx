
import React, { useState, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { Upload, Trash2, Image, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { StatePermissionsAuthCheck } from "@/components/product-management/StatePermissionsAuthCheck";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const OrgChartImageUploader: React.FC = () => {
  const { imageSettings, isLoading, error, uploadImage, removeImage, isUploading, isRemoving } = useOrgChartImage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated, isAdmin, isGuest } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
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

  const viewFullImage = () => {
    if (imageSettings?.url) {
      setDialogOpen(true);
    }
  };

  // Check for authentication and permission issues
  const hasPermissionError = error?.message?.includes("permission denied") || 
                            (!isAuthenticated || (!isAdmin && !isGuest));

  return (
    <div className="space-y-6">
      {/* Authentication check for management features */}
      {hasPermissionError && (
        <StatePermissionsAuthCheck 
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          error={error ? String(error.message) : null}
          refreshData={() => window.location.reload()}
        />
      )}

      {/* File upload section - only show if authenticated with proper permissions */}
      {(isAuthenticated && (isAdmin || isGuest)) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Upload Organization Chart Image</label>
                <div className="flex items-end gap-2">
                  <Input
                    type="file"
                    accept="image/*"
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
                  Recommended: PNG or JPEG image with organization chart structure (max 10MB)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current image section - visible to all */}
      <Card>
        <CardContent className="pt-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Current Organization Chart</h3>
              {imageSettings?.url && (isAuthenticated && (isAdmin || isGuest)) && (
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
                  Remove Image
                </Button>
              )}
            </div>
            
            {isLoading ? (
              <div className="h-[400px] w-full bg-muted animate-pulse rounded flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin opacity-30" />
              </div>
            ) : imageSettings?.url ? (
              <div className="border rounded-md overflow-hidden">
                <div className="relative">
                  <img 
                    src={imageSettings.url} 
                    alt="Organization Chart" 
                    className="w-full max-h-[400px] object-contain bg-muted cursor-pointer"
                    onClick={viewFullImage}
                  />
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="absolute bottom-2 right-2 opacity-80"
                    onClick={viewFullImage}
                  >
                    View Full Image
                  </Button>
                </div>
                <div className="p-2 bg-muted text-xs text-muted-foreground">
                  Updated: {imageSettings.updated_at ? new Date(imageSettings.updated_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            ) : (
              <div className="h-[200px] border rounded-md flex items-center justify-center bg-muted/30 text-muted-foreground flex-col gap-2">
                <Image className="h-10 w-10 opacity-20" />
                <p>No organization chart image uploaded</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Full-screen image dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Organization Chart</DialogTitle>
          </DialogHeader>
          {imageSettings?.url && (
            <img 
              src={imageSettings.url} 
              alt="Organization Chart" 
              className="w-full object-contain bg-muted"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrgChartImageUploader;
