
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

export interface OrgChartImageSettings {
  url: string | null;
  filename: string | null;
  updated_at: string | null;
}

export const useOrgChartImage = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isAuthenticated } = useAuth();

  // Fetch the current org chart image settings
  const { data: imageSettings, isLoading, error } = useQuery({
    queryKey: ['orgChartImage'],
    queryFn: async (): Promise<OrgChartImageSettings> => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('id', 'org_chart_image')
          .single();

        if (error) {
          // Handle permission errors gracefully
          if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
            console.log('Reading org chart as non-admin user');
            return { url: null, filename: null, updated_at: null };
          }
          
          console.error("Error fetching org chart image settings:", error);
          throw error;
        }

        // Properly cast the JSON value to our OrgChartImageSettings type
        if (!data?.value) {
          return { url: null, filename: null, updated_at: null };
        }
        
        return data.value as unknown as OrgChartImageSettings;
      } catch (error) {
        console.error("Error fetching org chart image:", error);
        return { url: null, filename: null, updated_at: null };
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
        toast.error("You must be an admin to upload an organization chart");
        throw new Error("Admin privileges required");
      }

      // Upload the file to storage
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
        console.error("Error uploading image:", uploadError);
        throw uploadError;
      }

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

      // Update the app_settings with the new image info
      const newSettings: OrgChartImageSettings = {
        url: publicUrl,
        filename: filePath,
        updated_at: new Date().toISOString(),
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
      toast.success("Organization chart image updated successfully");
      queryClient.setQueryData(['orgChartImage'], data);
    },
    onError: (error: any) => {
      toast.error("Failed to update organization chart image", {
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
        console.error("Error deleting image:", deleteError);
        throw deleteError;
      }

      // Update the app_settings to null
      const newSettings: OrgChartImageSettings = {
        url: null,
        filename: null,
        updated_at: new Date().toISOString(),
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
      toast.success("Organization chart image removed successfully");
      queryClient.setQueryData(['orgChartImage'], data);
    },
    onError: (error: any) => {
      toast.error("Failed to remove organization chart image", {
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
