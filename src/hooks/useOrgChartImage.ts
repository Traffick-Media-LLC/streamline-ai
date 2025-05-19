
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logEvent, generateRequestId } from "@/utils/logging";
import { BUCKET_ID } from "@/utils/storage/ensureBucketAccess";
import { checkAdminPermissions } from "@/utils/admin/checkAdminPermissions";

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
  const [adminPermissionVerified, setAdminPermissionVerified] = useState<boolean | null>(null);

  // Verify admin permissions directly using the function
  useEffect(() => {
    const verifyAdminPermissions = async () => {
      if (!user?.id) {
        setAdminPermissionVerified(false);
        return;
      }
      
      try {
        const result = await checkAdminPermissions(user.id);
        setAdminPermissionVerified(result.isAdmin);
        
        if (!result.isAdmin && isAdmin) {
          console.warn("Auth context reports user as admin but direct check failed", result);
        }
      } catch (error) {
        console.error("Error verifying admin permissions:", error);
        setAdminPermissionVerified(false);
      }
    };
    
    if (isAuthenticated && user) {
      verifyAdminPermissions();
    } else {
      setAdminPermissionVerified(false);
    }
  }, [isAuthenticated, user, isAdmin]);

  // Log authentication state on hook initialization
  useEffect(() => {
    logEvent({
      requestId: uploadRequestId,
      userId: user?.id,
      eventType: 'org_chart_auth_state',
      component: 'useOrgChartImage',
      message: 'OrgChart hook initialized',
      metadata: {
        isAdmin,
        isAuthenticated,
        adminVerified: adminPermissionVerified
      }
    });
  }, [isAdmin, isAuthenticated, user, session, uploadRequestId, adminPermissionVerified]);

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
          .maybeSingle();

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
      // Double check admin permissions both ways for security
      const shouldAllowUpload = adminPermissionVerified !== false && isAdmin;
      
      if (!isAuthenticated || !shouldAllowUpload) {
        toast.error("You must be an admin to upload an organization chart");
        throw new Error("Admin privileges required");
      }

      logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'upload_started',
        component: 'useOrgChartImage',
        message: 'Starting org chart upload',
        metadata: {
          isAdmin,
          adminVerified: adminPermissionVerified,
          shouldAllowUpload
        }
      });

      console.log("Starting upload with authenticated admin:", user?.id);
      
      try {
        // Upload the file directly
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
          
          logError(
            uploadRequestId,
            'useOrgChartImage',
            'Error uploading file',
            uploadError
          );
          
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
  
        // Use the secure function to update settings
        const { error: updateError } = await supabase
          .rpc('update_app_settings', {
            setting_id: 'org_chart_image',
            setting_value: newSettings as unknown as Json
          });

        if (updateError) {
          logError(
            uploadRequestId,
            'useOrgChartImage',
            'Error updating org chart image settings',
            updateError
          );
          
          // Detailed error information for debugging
          console.error("Update error details:", {
            error: updateError,
            userId: user?.id,
            isAdmin,
            adminVerified: adminPermissionVerified,
            sessionExpiry: session ? new Date(session.expires_at * 1000).toISOString() : 'No session'
          });
          
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
      } catch (error: any) {
        // Enhanced error logging with more context
        logError(
          uploadRequestId,
          'useOrgChartImage',
          'Upload process error',
          error,
          {
            userId: user?.id,
            isAdmin,
            hasValidSession: !!session,
            errorMessage: error.message || 'Unknown error'
          }
        );
        
        throw error;
      }
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
      
      const errorMessage = error.message || "Check that you have admin permissions";
      const permissionDenied = errorMessage.includes('permission denied');
      
      toast.error(
        permissionDenied ? 
          "Permission denied. Please refresh the page and try again." : 
          "Failed to update organization chart", 
        {
          description: errorMessage
        }
      );
    }
  });

  // Remove the current org chart image
  const removeImage = useMutation({
    mutationFn: async () => {
      // Double check admin permissions for security
      if (!isAuthenticated || !adminPermissionVerified || !isAdmin) {
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

      // Use secure RPC function
      const newSettings: OrgChartImageSettings = {
        url: null,
        filename: null,
        updated_at: new Date().toISOString(),
        fileType: null,
      };
      
      try {
        // Use the secure function to update settings
        const { error: updateError } = await supabase
          .rpc('update_app_settings', {
            setting_id: 'org_chart_image',
            setting_value: newSettings as unknown as Json
          });
            
        if (updateError) throw updateError;
      } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
      }

      return newSettings;
    },
    onSuccess: (data) => {
      toast.success("Organization chart removed successfully");
      queryClient.setQueryData(['orgChartImage'], data);
    },
    onError: (error: any) => {
      toast.error("Failed to remove organization chart", {
        description: error.message || "Check that you have admin permissions"
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
    adminPermissionVerified
  };
};
