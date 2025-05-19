import React, { useState, useEffect } from 'react';
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ZoomIn, ZoomOut, Download, FileText, Eye, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Employee } from '@/hooks/useEmployeesData';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { Json } from "@/integrations/supabase/types";

interface OrgChartViewerProps {
  employees?: Employee[];
  // Add an optional override URL prop
  overrideUrl?: string;
}

// Extended type to handle both direct properties and nested value structure
type OrgChartImageData = {
  url?: string;
  filename?: string;
  updated_at?: string;
  fileType?: "image" | "pdf" | null;
};

const OrgChartViewer: React.FC<OrgChartViewerProps> = ({ 
  employees,
  // Use the specified URL as default override
  overrideUrl = "https://vtetryrdbntasdlutbdr.supabase.co/storage/v1/object/public/org_chart//org_chart_1747673921077.pdf"
}) => {
  const { imageSettings, isLoading, error, uploadImage } = useOrgChartImage();
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(overrideUrl);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usingOverrideUrl, setUsingOverrideUrl] = useState(!!overrideUrl);

  // Helper function to ensure URLs are absolute
  const ensureAbsoluteUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    // If URL already includes http(s), it's already absolute
    if (url.match(/^https?:\/\//)) return url;
    
    // If URL starts with a slash, prepend origin
    if (url.startsWith('/')) {
      return `${window.location.origin}${url}`;
    }
    
    // Otherwise, assume it's relative to the origin
    return `${window.location.origin}/${url}`;
  };

  // Helper function to extract URL from imageSettings, handling different structures
  const extractImageUrl = (): string | null => {
    if (!imageSettings) return null;
    
    // Direct url property
    if (typeof imageSettings === 'object' && imageSettings !== null && 'url' in imageSettings) {
      return imageSettings.url as string;
    }
    
    // No value to extract
    return null;
  };

  useEffect(() => {
    console.log("OrgChartViewer current image settings:", imageSettings);
    console.log("Using override URL:", overrideUrl);
    
    // Set local image URL state from imageSettings only if not using an override
    if (!overrideUrl && !imageLoadError) {
      const settingsUrl = extractImageUrl();
          
      if (settingsUrl) {
        const absoluteUrl = ensureAbsoluteUrl(settingsUrl);
        setLocalImageUrl(absoluteUrl);
        console.log("Setting absolute URL from settings:", absoluteUrl);
      }
    }
  }, [imageSettings, imageLoadError, overrideUrl]);

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
        
        // Use override URL if set, otherwise use the URL from the database
        if (overrideUrl) {
          setLocalImageUrl(overrideUrl);
          setUsingOverrideUrl(true);
          toast.success('Using specified PDF URL');
        } else if (data.value && typeof data.value === 'object' && 'url' in data.value) {
          // Extract URL from value object
          const valueObj = data.value as unknown as { url: string };
          const valueUrl = valueObj.url;
          const absoluteUrl = ensureAbsoluteUrl(valueUrl);
          setLocalImageUrl(absoluteUrl);
          toast.success('Chart data refreshed');
          console.log("URL after refresh:", absoluteUrl);
        }
      } else {
        if (overrideUrl) {
          setLocalImageUrl(overrideUrl);
          setUsingOverrideUrl(true);
          toast.info('Using specified PDF URL');
        } else {
          toast.info('No chart data available');
        }
      }
    } catch (e) {
      console.error('Exception refreshing chart data:', e);
      
      // Still use override URL if available, even if refresh fails
      if (overrideUrl) {
        setLocalImageUrl(overrideUrl);
        setUsingOverrideUrl(true);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle between override URL and database URL
  const toggleUrlSource = () => {
    // Get URL from settings
    const settingsUrl = extractImageUrl();
      
    if (usingOverrideUrl && settingsUrl) {
      // Switch to URL from database
      setUsingOverrideUrl(false);
      const absoluteUrl = ensureAbsoluteUrl(settingsUrl);
      setLocalImageUrl(absoluteUrl);
      toast.info('Using URL from database');
    } else if (overrideUrl) {
      // Switch to override URL
      setUsingOverrideUrl(true);
      setLocalImageUrl(overrideUrl);
      toast.info('Using specified PDF URL');
    }
  };

  if (error && !overrideUrl) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading organization chart: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading && !overrideUrl) {
    return (
      <div className="h-[400px] w-full bg-muted animate-pulse rounded flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If we have an override URL, always use it
  const displayUrl = localImageUrl || overrideUrl;
  const isPdf = displayUrl?.endsWith('.pdf') || imageSettings?.fileType === 'pdf';

  // If no image is available or there was a load error, show a message
  if (!displayUrl && ((!extractImageUrl()) || (imageLoadError))) {
    return (
      <div className="h-[200px] border rounded-md flex items-center justify-center bg-muted/30 text-muted-foreground flex-col gap-4">
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
    if (displayUrl) {
      try {
        const url = displayUrl;
        const link = document.createElement('a');
        link.href = url;
        link.download = isPdf ? 'organization_chart.pdf' : 'organization_chart.png';
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
                onClick={() => window.open(displayUrl, '_blank')}
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
              src={displayUrl} 
              alt="Organization Chart" 
              className="w-full object-contain bg-muted"
              style={{ maxHeight: '600px' }}
              onLoad={() => {
                console.log("Image loaded successfully:", displayUrl);
                setImageLoadError(false);
              }}
              onError={(e) => {
                console.error("Image failed to load:", displayUrl);
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
          {usingOverrideUrl ? (
            <span className="flex items-center justify-between">
              <span>Using manually specified PDF URL</span>
              {/* Check if imageSettings contains a valid URL */}
              {imageSettings && extractImageUrl() && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleUrlSource}
                >
                  Switch to DB URL
                </Button>
              )}
            </span>
          ) : (
            <>
              Updated: {imageSettings?.updated_at ? new Date(imageSettings.updated_at).toLocaleString() : 'N/A'}
              {isPdf && " • PDF document"}
              {overrideUrl && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={toggleUrlSource}
                >
                  Use specified URL
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {!isPdf && displayUrl && (
        <Dialog open={fullscreenImage} onOpenChange={setFullscreenImage}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-fit p-0">
            <div className="relative overflow-auto max-h-[90vh]">
              <img 
                src={displayUrl} 
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
