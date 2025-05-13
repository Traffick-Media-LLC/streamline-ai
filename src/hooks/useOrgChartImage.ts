import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logEvent, generateRequestId } from "@/utils/logging";

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
    const logAuthState = async () => {
      await logEvent({
        requestId: uploadRequestId,
        userId: user?.id,
        eventType: 'org_chart_auth_state',
        component: 'useOrgChartImage',
        message: 'OrgChart hook initialized',
        metadata: {
          isAuthenticated,
          isAdmin, 
          hasUser: !!user,
          hasSession: !!session,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
          sessionProvider: session?.provider,
          userMetadata: user?.user_metadata,
        },
        severity: 'info',
        category: 'auth'
      });

      // Double-check admin status directly with the database
      if (isAuthenticated && user) {
        try {
          const { data: adminCheck, error: adminCheckError } = await supabase.rpc('is_admin');
          
          if (adminCheckError) {
            await logError(
              uploadRequestId,
              'useOrgChartImage',
              'Error checking admin status via RPC',
              adminCheckError,
              { userId: user?.id },
              'error',
              'credential'
            );
          } else {
            await logEvent({
              requestId: uploadRequestId,
              userId: user?.id,
              eventType: 'admin_check',
              component: 'useOrgChartImage',
              message: `Admin check result: ${adminCheck}`,
              metadata: { adminCheck, clientSideAdminValue: isAdmin },
              severity: adminCheck === isAdmin ? 'info' : 'warning',
              category: 'auth'
            });
          }
          
          // Also check user_roles table directly as backup
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          if (roleError) {
            await logError(
              uploadRequestId,
              'useOrgChartImage',
              'Error checking user role from table',
              roleError,
              { userId: user?.id },
              'warning',
              'credential'
            );
          } else {
            await logEvent({
              requestId: uploadRequestId,
              userId: user?.id,
              eventType: 'role_check',
              component: 'useOrgChartImage',
              message: `User role from table: ${roleData?.role || 'none'}`,
              metadata: { role: roleData?.role, userId: user.id },
              severity: 'info',
              category: 'auth'
            });
          }
        } catch (error) {
          await logError(
            uploadRequestId,
            'useOrgChartImage',
            'Unexpected error checking admin status',
            error,
            { userId: user?.id },
            'error',
            'credential'
          );
        }
      }
    };

    logAuthState();
  }, [isAdmin, isAuthenticated, user, session, uploadRequestId]);

  // Fetch the current org chart image settings
  const { data: imageSettings, isLoading, error } = useQuery({
    queryKey: ['orgChartImage'],
    queryFn: async (): Promise<OrgChartImageSettings> => {
      try {
        await logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'fetch_image_settings_start',
          component: 'useOrgChartImage',
          message: 'Fetching org chart settings',
          metadata: {
            isAuthenticated,
            isAdmin
          },
          severity: 'info'
        });

        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'org_chart_image')
          .single();

        if (error) {
          // Handle permission errors gracefully
          if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
            await logEvent({
              requestId: uploadRequestId,
              userId: user?.id,
              eventType: 'fetch_image_settings_permission_denied',
              component: 'useOrgChartImage',
              message: 'Reading org chart as non-admin user',
              metadata: { error },
              severity: 'warning'
            });
            return { url: null, filename: null, updated_at: null, fileType: null };
          }
          
          await logError(
            uploadRequestId,
            'useOrgChartImage',
            'Error fetching org chart image settings',
            error,
            { isAdmin, isAuthenticated },
            'error',
            'database'
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
        
        await logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'fetch_image_settings_success',
          component: 'useOrgChartImage',
          message: 'Successfully fetched org chart settings',
          metadata: {
            hasUrl: !!settings?.url,
            fileType: settings?.fileType
          },
          severity: 'info'
        });
        
        return settings;
      } catch (error) {
        await logError(
          uploadRequestId,
          'useOrgChartImage',
          'Error fetching org chart image',
          error,
          { isAdmin, isAuthenticated },
          'error',
          'database'
        );
        return { url: null, filename: null, updated_at: null, fileType: null };
      }
    },
    // Don't attempt to refetch if there was a permission error
    retry: (failureCount, error: any) => {
      return !(error.code === 'PGRST301' || error.message?.includes('permission denied')) && failureCount < 2;
    }
  });

  // Upload a new org chart image
  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      if (!isAuthenticated || !isAdmin) {
        await logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'upload_auth_check_failed',
          component: 'useOrgChartImage',
          message: 'Upload attempted without admin privileges',
          metadata: { isAuthenticated, isAdmin, fileType: file.type, fileSize: file.size },
          severity: 'warning',
          category: 'auth'
        });
        
        toast.error("You must be an admin to upload an organization chart");
        throw new Error("Admin privileges required");
      }

      if (!user || !session) {
        await logEvent({
          requestId: uploadRequestId,
          userId: user?.id,
          eventType: 'upload_invalid_session',
          component: 'useOrgChartImage',
          message: 'Upload attempted with missing session',
          metadata: { hasUser: !!user, hasSession: !!session, fileType: file.type },
          severity: 'warning',
          category: 'auth'
        });
        
        toast.error("Authentication session is missing. Please try logging out and back in.");
        throw new Error("Authentication session is invalid");
      }

      await logEvent({
        requestId: uploadRequestId,
        userId: user.id,
        eventType: 'upload_started',
        component: 'useOrgChartImage',
        message: 'Starting org chart upload',
        metadata: { 
          fileType: file.type, 
          fileSize: file.size,
          fileName: file.name,
          isAdmin,
          sessionExpiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown'
        },
        severity: 'info',
        category: 'network'
      });

      console.log("Starting upload with authenticated user:", user.id);

      // Check bucket existence first and log the result
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('org_chart');
        
        await logEvent({
          requestId: uploadRequestId,
          userId: user.id,
          eventType: 'bucket_check',
          component: 'useOrgChartImage',
          message: bucketError ? 'Bucket check failed' : 'Bucket check successful',
          metadata: { 
            bucketExists: !!bucketData,
            bucketError: bucketError?.message,
            bucketData
          },
          severity: bucketError ? 'warning' : 'info'
        });
        
        if (bucketError) {
          console.error("Error checking storage bucket:", bucketError);
        }
      } catch (error) {
        await logError(
          uploadRequestId,
          'useOrgChartImage',
          'Error checking storage bucket',
          error,
          { userId: user.id },
          'warning'
        );
      }

      // Verify access permissions
      try {
        // Test write permission with a small test file
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        const testFile = new File([testBlob], '_test_permissions.txt', { type: 'text/plain' });
        
        await logEvent({
          requestId: uploadRequestId,
          userId: user.id,
          eventType: 'permission_test_started',
          component: 'useOrgChartImage',
          message: 'Testing storage write permissions',
          metadata: {},
          severity: 'info'
        });
        
        // Check session before upload
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          await logError(
            uploadRequestId,
            'useOrgChartImage',
            'Session verification failed',
            sessionError,
            { userId: user.id },
            'error',
            'auth'
          );
        } else {
          await logEvent({
            requestId: uploadRequestId,
            userId: user.id,
            eventType: 'session_verified',
            component: 'useOrgChartImage',
            message: 'Session verified before upload',
            metadata: { 
              hasSession: !!currentSession,
              expiresAt: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'unknown'
            },
            severity: 'info',
            category: 'auth'
          });
        }
        
        // Upload the test file to check permissions
        const { error: testUploadError } = await supabase.storage
          .from('org_chart')
          .upload('_test_permissions.txt', testFile, {
            upsert: true,
            contentType: 'text/plain',
          });
        
        if (testUploadError) {
          await logError(
            uploadRequestId,
            'useOrgChartImage',
            'Permission test failed',
            testUploadError,
            { 
              userId: user.id,
              isAdmin,
              hasSession: !!currentSession
            },
            'error',
            'auth'
          );
          
          // Add detailed logging for security policy errors
          if (testUploadError.message.includes('new row violates row-level security policy')) {
            await logEvent({
              requestId: uploadRequestId,
              userId: user.id,
              eventType: 'rls_policy_violation',
              component: 'useOrgChartImage',
              message: 'RLS policy violation in test upload',
              metadata: {
                isAuthenticated,
                isAdmin,
                hasUser: !!user,
                hasSession: !!session,
                userId: user.id,
                errorMessage: testUploadError.message,
                errorCode: testUploadError.code
              },
              severity: 'error',
              category: 'auth'
            });
          }
        } else {
          await logEvent({
            requestId: uploadRequestId,
            userId: user.id,
            eventType: 'permission_test_successful',
            component: 'useOrgChartImage',
            message: 'Permission test successful, proceeding with upload',
            metadata: {},
            severity: 'info'
          });
          
          // Clean up test file
          await supabase.storage
            .from('org_chart')
            .remove(['_test_permissions.txt']);
        }
      } catch (error) {
        await logError(
          uploadRequestId,
          'useOrgChartImage',
          'Error testing storage permissions',
          error,
          { userId: user.id },
          'error'
        );
      }

      // Upload the actual file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `org_chart_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError, data } = await supabase.storage
        .from('org_chart')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        
        // Add more detailed error information for debugging
        if (uploadError.message.includes('new row violates row-level security policy')) {
          await logEvent({
            requestId: uploadRequestId,
            userId: user.id,
            eventType: 'rls_policy_violation',
            component: 'useOrgChartImage',
            message: 'RLS Policy Error during file upload',
            metadata: {
              isAuthenticated,
              isAdmin, 
              hasUser: !!user,
              hasSession: !!session,
              userId: user.id,
              fileType: file.type,
              fileSize: file.size,
              errorMessage: uploadError.message,
              errorCode: uploadError.code
            },
            severity: 'error',
            category: 'auth'
          });
          
          // Try to diagnose RLS issues by checking policies
          try {
            // This will only work if the user has permissions to the storage schema
            const { data: policies, error: policiesError } = await supabase.rpc('is_admin');
            
            await logEvent({
              requestId: uploadRequestId,
              userId: user.id,
              eventType: 'admin_check_during_error',
              component: 'useOrgChartImage',
              message: 'Checked admin status during error',
              metadata: { 
                adminCheckResult: policies,
                adminCheckError: policiesError?.message
              },
              severity: 'info'
            });
          } catch (error) {
            await logError(
              uploadRequestId,
              'useOrgChartImage',
              'Error checking policies during upload failure',
              error,
              { userId: user.id },
              'warning'
            );
          }
          
          toast.error("Upload failed due to permission issues. Please check your login status.");
        } else {
          await logError(
            uploadRequestId,
            'useOrgChartImage',
            'Error uploading file',
            uploadError,
            {
              fileType: file.type,
              fileSize: file.size,
              userId: user.id,
              isAdmin,
              hasSession: !!session
            },
            'error',
            'network'
          );
        }
        
        throw uploadError;
      }
      
      await logEvent({
        requestId: uploadRequestId,
        userId: user.id,
        eventType: 'file_uploaded',
        component: 'useOrgChartImage',
        message: 'File uploaded successfully',
        metadata: { 
          filePath,
          fileType: file.type,
          fileSize: file.size
        },
        severity: 'info'
      });

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('org_chart')
        .getPublicUrl(filePath);

      // Remove old image if exists
      if (imageSettings?.filename && imageSettings.filename !== fileName) {
        await supabase.storage
          .from('org_chart')
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

      await logEvent({
        requestId: uploadRequestId,
        userId: user.id,
        eventType: 'updating_settings',
        component: 'useOrgChartImage',
        message: 'Updating app settings with new file info',
        metadata: { 
          newSettings,
          fileType
        },
        severity: 'info'
      });

      const { error: updateError } = await supabase
        .from('app_settings')
        .update({ value: newSettings as unknown as Json })
        .eq('id', 'org_chart_image');

      if (updateError) {
        await logError(
          uploadRequestId,
          'useOrgChartImage',
          'Error updating org chart image settings',
          updateError,
          {
            userId: user.id,
            isAdmin,
            newSettings
          },
          'error',
          'database'
        );
        
        throw updateError;
      }

      await logEvent({
        requestId: uploadRequestId,
        userId: user.id,
        eventType: 'upload_complete',
        component: 'useOrgChartImage',
        message: 'Org chart upload and settings update completed successfully',
        metadata: { 
          newSettings,
          fileType
        },
        severity: 'info'
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
        message: 'User notified of successful upload',
        metadata: {},
        severity: 'info'
      });
    },
    onError: (error: any) => {
      console.error("Upload error details:", error);
      
      logError(
        uploadRequestId,
        'useOrgChartImage',
        'Upload error in mutation handler',
        error,
        {
          isAuthenticated,
          isAdmin,
          hasUser: !!user,
          hasSession: !!session
        },
        'error',
        'network'
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
        .from('org_chart')
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
