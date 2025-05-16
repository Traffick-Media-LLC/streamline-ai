
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logEvent, generateRequestId } from "@/utils/logging";
import { BUCKET_ID } from "@/utils/storage/ensureBucketAccess";

export interface OrgChartImageSettings {
  url: string | null;
  filename: string | null;
  updated_at: string | null;
  fileType: "image" | "pdf" | null;
}

export const useOrgChartImage = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isAuthenticated, user, session } = useAuth();
  const uploadRequestId = generateRequestId();

  // Log authentication state on hook initialization
  useEffect(() => {
    logEvent({
      requestId: uploadRequestId,
      userId: user?.id,
      eventType: 'org_chart_auth_state',
      component: 'useOrgChartImage',
      message: 'OrgChart hook initialized'
    });
  }, [isAdmin, isAuthenticated, user, session, uploadRequestId]);

  // Fetch the current org chart image settings
  const { data: imageSettings, isLoading, error } = useQuery({
    queryKey: ['orgChartImage'],
    queryFn: async (): Promise<OrgChartImageSettings> => {
      try {
        logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'fetch_image_settings_start',
          component: 'useOrgChartImage',
          message: 'Fetching org chart settings'
        });

        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'org_chart_image')
          .single();

        if (error) {
          // Handle permission errors gracefully
          if (error.message.includes('permission denied')) {
            logEvent({
              requestId: uploadRequestId,
              userId: user?.id,
              eventType: 'fetch_image_settings_permission_denied',
              component: 'useOrgChartImage',
              message: 'Reading org chart as non-admin user'
            });
            return { url: null, filename: null, updated_at: null, fileType: null };
          }
          
          logError(
            uploadRequestId,
            'useOrgChartImage',
            'Error fetching org chart image settings',
            error
          );
          
          throw error;
        }

        // Properly cast the JSON value to our OrgChartImageSettings type
        if (!data?.value) {
          return { url: null, filename: null, updated_at: null, fileType: null };
        }
        
        // Handle legacy data that might not have fileType
        const settings = data.value as unknown as OrgChartImageSettings;
        if (settings && settings.url && !settings.fileType) {
          // Infer file type from URL if it's not set
          const isImage = settings.url.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i);
          const isPdf = settings.url.match(/\.(pdf)$/i);
          settings.fileType = isPdf ? "pdf" : "image";
        }
        
        logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'fetch_image_settings_success',
          component: 'useOrgChartImage',
          message: 'Successfully fetched org chart settings'
        });
        
        return settings;
      } catch (error) {
        logError(
          uploadRequestId,
          'useOrgChartImage',
          'Error fetching org chart image',
          error
        );
        return { url: null, filename: null, updated_at: null, fileType: null };
      }
    },
    // Don't attempt to refetch if there was a permission error
    retry: (failureCount, error: any) => {
      return !error.message?.includes('permission denied') && failureCount < 2;
    }
  });

  // Upload a new org chart image
  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      // Only check if user is authenticated and admin, but don't do additional verification
      if (!isAuthenticated || !isAdmin) {
        logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'upload_auth_check_failed',
          component: 'useOrgChartImage',
          message: 'Upload attempted without admin privileges'
        });
        
        toast.error("You must be an admin to upload an organization chart");
        throw new Error("Admin privileges required");
      }

      logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'upload_started',
        component: 'useOrgChartImage',
        message: 'Starting org chart upload'
      });

      console.log("Starting upload with authenticated user:", user?.id);
      console.log("Using bucket:", BUCKET_ID);

      // Upload the actual file directly without test permissions
      const fileExt = file.name.split('.').pop();
      const fileName = `org_chart_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError, data } = await supabase.storage
        .from(BUCKET_ID)
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        
        if (uploadError.message.includes('new row violates row-level security policy')) {
          logEvent({
            requestId: uploadRequestId,
            userId: user?.id,
            eventType: 'rls_policy_violation',
            component: 'useOrgChartImage',
            message: 'RLS Policy Error during file upload'
          });
          
          toast.error("Upload failed due to permission issues. Please contact an administrator.");
        } else {
          logError(
            uploadRequestId,
            'useOrgChartImage',
            'Error uploading file',
            uploadError
          );
        }
        
        throw uploadError;
      }
      
      logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'file_uploaded',
        component: 'useOrgChartImage',
        message: 'File uploaded successfully'
      });

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_ID)
        .getPublicUrl(filePath);

      // Remove old image if exists
      if (imageSettings?.filename && imageSettings.filename !== fileName) {
        await supabase.storage
          .from(BUCKET_ID)
          .remove([imageSettings.filename]);
      }

      // Determine file type
      const fileType = file.type.includes('pdf') ? 'pdf' : 'image';

      // Update the app_settings with the new image info
      const newSettings: OrgChartImageSettings = {
        url: publicUrl,
        filename: filePath,
        updated_at: new Date().toISOString(),
        fileType: fileType,
      };

      logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'updating_settings',
        component: 'useOrgChartImage',
        message: 'Updating app settings with new file info'
      });

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ value: newSettings as unknown as Json })
        .eq('id', 'org_chart_image');

      if (updateError) {
        logError(
          uploadRequestId,
          'useOrgChartImage',
          'Error updating org chart image settings',
          updateError
        );
        
        throw updateError;
      }

      logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'upload_complete',
        component: 'useOrgChartImage',
        message: 'Org chart upload and settings update completed successfully'
      });

      return newSettings;
    },
    onSuccess: (data) => {
      toast.success("Organization chart updated successfully");
      queryClient.setQueryData(['orgChartImage'], data);
      
      logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'upload_success_notification',
        component: 'useOrgChartImage',
        message: 'User notified of successful upload'
      });
    },
    onError: (error: any) => {
      console.error("Upload error details:", error);
      
      logError(
        uploadRequestId,
        'useOrgChartImage',
        'Upload error in mutation handler',
        error
      );
      
      toast.error("Failed to update organization chart", {
        description: error.message
      });
    }
  });

  // Remove the current org chart image
  const removeImage = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated || !isAdmin) {
        toast.error("You must be an admin to remove an organization chart");
        throw new Error("Admin privileges required");
      }
      
      if (!imageSettings?.filename) {
        return;
      }

      // Remove the file from storage
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_ID)
        .remove([imageSettings.filename]);

      if (deleteError) {
        console.error("Error deleting file:", deleteError);
        throw deleteError;
      }

      // Update the app_settings to null
      const newSettings: OrgChartImageSettings = {
        url: null,
        filename: null,
        updated_at: new Date().toISOString(),
        fileType: null,
      };

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ value: newSettings as unknown as Json })
        .eq('id', 'org_chart_image');

      if (updateError) {
        console.error("Error updating org chart image settings:", updateError);
        throw updateError;
      }

      return newSettings;
    },
    onSuccess: (data) => {
      toast.success("Organization chart removed successfully");
      queryClient.setQueryData(['orgChartImage'], data);
    },
    onError: (error: any) => {
      toast.error("Failed to remove organization chart", {
        description: error.message
      });
    }
  });

  return {
    imageSettings,
    isLoading,
    error,
    uploadImage: (file: File) => uploadImage.mutate(file),
    removeImage: () => removeImage.mutate(),
    isUploading: uploadImage.isPending,
    isRemoving: removeImage.isPending,
  };
};
