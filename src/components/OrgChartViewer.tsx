
import React, { useState, useEffect } from 'react';
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ZoomIn, ZoomOut, Download, FileText, Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Employee } from '@/hooks/useEmployeesData';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';

interface OrgChartViewerProps {
  employees?: Employee[];
}

const OrgChartViewer: React.FC<OrgChartViewerProps> = ({ employees }) => {
  const { imageSettings, isLoading, error, uploadImage } = useOrgChartImage();
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // For debugging purposes
  useEffect(() => {
    console.log('OrgChartViewer current image settings:', imageSettings);
    
    // Set local image URL state from imageSettings
    if (imageSettings?.url && !imageLoadError) {
      setLocalImageUrl(imageSettings.url);
    }
  }, [imageSettings, imageLoadError]);

  // Force refresh the org chart data from the database
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Clear any previous errors
      setImageLoadError(false);
      
      // Direct query to app_settings table
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('id', 'org_chart_image')
        .single();
      
      if (error) {
        console.error('Error refreshing chart data:', error);
        toast.error('Failed to refresh chart data');
      } else if (data?.value) {
        console.log('Refreshed chart data:', data.value);
        // Manually set the local image URL from the fresh data
        const settings = data.value as any;
        if (settings.url) {
          setLocalImageUrl(settings.url);
          toast.success('Chart data refreshed');
        }
      } else {
        toast.info('No chart data available');
      }
    } catch (e) {
      console.error('Exception refreshing chart data:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading organization chart: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="h-[400px] w-full bg-muted animate-pulse rounded flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If no image is available or there was a load error, show a message
  if ((!localImageUrl && !imageSettings?.url) || (imageLoadError && !localImageUrl)) {
    return (
      <div className="h-[200px] border rounded-md flex items-center justify-center bg-muted/30 text-muted-foreground flex-col gap-2">
        <p>No organization chart available</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
    );
  }

  const handleDownload = () => {
    if (localImageUrl || imageSettings?.url) {
      try {
        const url = localImageUrl || imageSettings?.url;
        const link = document.createElement('a');
        link.href = url!;
        link.download = imageSettings?.fileType === 'pdf' 
          ? 'organization_chart.pdf' 
          : 'organization_chart.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download started");
      } catch (e) {
        console.error("Download error:", e);
        toast.error("Failed to download file");
      }
    }
  };

  const isPdf = imageSettings?.fileType === 'pdf';

  return (
    <div className="space-y-4">
      <div className="relative border rounded-md overflow-hidden">
        {isPdf ? (
          <div className="w-full h-[600px] bg-muted/10 p-4 flex flex-col items-center justify-center">
            <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="mb-6 text-center">PDF Organization Chart</p>
            <div className="flex flex-row gap-2">
              <Button 
                variant="secondary" 
                onClick={() => window.open(imageSettings.url!, '_blank')}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                View PDF
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <img 
              src={localImageUrl || imageSettings?.url || "https://placehold.co/800x600?text=Organization+Chart+Loading"} 
              alt="Organization Chart" 
              className="w-full object-contain bg-muted"
              style={{ maxHeight: '600px' }}
              onLoad={() => {
                console.log("Image loaded successfully:", localImageUrl || imageSettings?.url);
                setImageLoadError(false);
              }}
              onError={(e) => {
                console.error("Image failed to load:", localImageUrl || imageSettings?.url);
                setImageLoadError(true);
                toast.error("Image failed to load");
                // Replace with a placeholder image as fallback
                (e.target as HTMLImageElement).src = "https://placehold.co/800x600?text=Organization+Chart+Error";
              }}
            />
            
            <div className="absolute top-2 right-2 flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="opacity-70 hover:opacity-100"
                onClick={() => setFullscreenImage(true)}
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                View Full Size
              </Button>
              
              <Button 
                variant="secondary" 
                size="sm" 
                className="opacity-70 hover:opacity-100"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="opacity-70 hover:opacity-100"
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        )}
        
        <div className="p-2 bg-muted text-xs text-muted-foreground">
          Updated: {imageSettings?.updated_at ? new Date(imageSettings.updated_at).toLocaleString() : 'N/A'}
          {isPdf && " • PDF document"}
        </div>
      </div>
      
      {!isPdf && (localImageUrl || imageSettings?.url) && (
        <Dialog open={fullscreenImage} onOpenChange={setFullscreenImage}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-fit p-0">
            <div className="relative overflow-auto max-h-[90vh]">
              <img 
                src={localImageUrl || imageSettings!.url!} 
                alt="Organization Chart (Full Size)" 
                className="w-auto h-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/800x600?text=Organization+Chart+Error";
                }}
              />
              <Button 
                className="absolute top-2 right-2 opacity-80 hover:opacity-100"
                size="sm"
                onClick={() => setFullscreenImage(false)}
              >
                <ZoomOut className="h-4 w-4 mr-1" />
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default OrgChartViewer;
