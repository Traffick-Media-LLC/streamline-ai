
import React, { useState } from 'react';
import { useOrgChartImage } from '@/hooks/useOrgChartImage';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, ZoomIn, ZoomOut, Download, FileText, Eye } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import OrgChart from './OrgChart';
import { Employee } from '@/hooks/useEmployeesData';

interface OrgChartViewerProps {
  employees?: Employee[];
}

const OrgChartViewer: React.FC<OrgChartViewerProps> = ({ employees = [] }) => {
  const { imageSettings, isLoading, error } = useOrgChartImage();
  const [fullscreenImage, setFullscreenImage] = useState(false);
  const [useInteractive, setUseInteractive] = useState(false);

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

  // Check if we have an image from storage OR if we want to use interactive mode
  const showInteractiveChart = useInteractive || (!imageSettings?.url && employees?.length > 0);

  // If no image is available and no employees, show a message
  if (!imageSettings?.url && employees.length === 0) {
    return (
      <div className="h-[200px] border rounded-md flex items-center justify-center bg-muted/30 text-muted-foreground flex-col gap-2">
        <p>No organization chart available</p>
      </div>
    );
  }

  const handleDownload = () => {
    if (imageSettings?.url) {
      const link = document.createElement('a');
      link.href = imageSettings.url;
      link.download = imageSettings.fileType === 'pdf' 
        ? 'organization_chart.pdf' 
        : 'organization_chart.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isPdf = imageSettings?.fileType === 'pdf';

  return (
    <div className="space-y-4">
      {/* Toggle button for interactive/static views if employees are available */}
      {employees && employees.length > 0 && imageSettings?.url && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            onClick={() => setUseInteractive(!useInteractive)}
          >
            {useInteractive ? 'View Static Chart' : 'View Interactive Chart'}
          </Button>
        </div>
      )}
      
      {showInteractiveChart ? (
        <OrgChart employees={employees} />
      ) : (
        <>
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
                  src={imageSettings.url} 
                  alt="Organization Chart" 
                  className="w-full object-contain bg-muted"
                  style={{ maxHeight: '600px' }}
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
                </div>
              </div>
            )}
            
            <div className="p-2 bg-muted text-xs text-muted-foreground">
              Updated: {imageSettings.updated_at ? new Date(imageSettings.updated_at).toLocaleString() : 'N/A'}
              {isPdf && " • PDF document"}
            </div>
          </div>
          
          {!isPdf && imageSettings?.url && (
            <Dialog open={fullscreenImage} onOpenChange={setFullscreenImage}>
              <DialogContent className="max-w-[90vw] max-h-[90vh] w-fit p-0">
                <div className="relative overflow-auto max-h-[90vh]">
                  <img 
                    src={imageSettings.url} 
                    alt="Organization Chart (Full Size)" 
                    className="w-auto h-auto object-contain"
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
        </>
      )}
    </div>
  );
};

export default OrgChartViewer;
