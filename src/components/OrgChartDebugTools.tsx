
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from '@/components/ui/sonner';
import { setTestOrgChartImage, getOrgChartImageSettings } from '@/utils/storage/testOrgChartImage';
import { Separator } from '@/components/ui/separator';

const OrgChartDebugTools: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSetTestImage = async () => {
    setLoading(true);
    try {
      const result = await setTestOrgChartImage();
      if (result.success) {
        toast.success('Test image settings successfully applied');
        // Reload the page to see the changes
        window.location.reload();
      } else {
        toast.error('Failed to set test image settings');
      }
    } catch (error) {
      console.error('Error setting test image:', error);
      toast.error('Error setting test image');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSettings = async () => {
    setLoading(true);
    try {
      const result = await getOrgChartImageSettings();
      if (result.success) {
        setSettings(result.data);
        toast.success('Retrieved current settings');
      } else {
        toast.error('Failed to get current settings');
      }
    } catch (error) {
      console.error('Error getting settings:', error);
      toast.error('Error getting settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Org Chart Debug Tools</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={handleSetTestImage}
              disabled={loading}
            >
              Set Test Image
            </Button>
            <Button 
              variant="outline" 
              onClick={handleGetSettings}
              disabled={loading}
            >
              Get Current Settings
            </Button>
          </div>

          {settings && (
            <>
              <Separator />
              <div className="mt-2">
                <h3 className="font-medium mb-2">Current Settings:</h3>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-[300px]">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgChartDebugTools;
