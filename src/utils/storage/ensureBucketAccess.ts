
import { supabase } from "@/integrations/supabase/client";
import { logError, logEvent, generateRequestId } from "@/utils/logging";

// Define a proper return type for the function
export interface BucketAccessResult {
  success: boolean;
  error?: any;
  message?: string;
}

// Constants for bucket configuration
export const BUCKET_ID = 'org_chart';
export const BUCKET_NAME = 'Organization Chart';

export async function ensureBucketAccess(userId: string | undefined): Promise<BucketAccessResult> {
  const requestId = generateRequestId();
  
  try {
    logEvent({
      requestId,
      userId,
      eventType: 'ensure_bucket_access_start',
      component: 'ensureBucketAccess',
      message: 'Checking bucket access'
    });
    
    // Check if the user is authenticated
    if (!userId) {
      return { 
        success: false, 
        message: 'User is not authenticated. Please log in first.' 
      };
    }
    
    // Verify the bucket exists by checking if we can list files
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_ID)
        .list('', { limit: 1 });
      
      if (error) {
        logError(
          requestId,
          'ensureBucketAccess',
          `Error accessing bucket ${BUCKET_ID}`,
          error
        );
        
        // Special handling for permission denied errors
        if (error.message?.includes('permission denied')) {
          return { 
            success: false, 
            error: error,
            message: `Permission denied for ${BUCKET_ID} bucket. This usually means your admin role is not correctly applied.`
          };
        }
        
        // Handle case where bucket may not exist
        if (error.message?.includes('does not exist')) {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Try to call the edge function to create the bucket
            const { error: setupError } = await supabase.functions.invoke('storage_setup', {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });
            
            if (setupError) {
              logError(
                requestId,
                'ensureBucketAccess',
                'Error setting up storage',
                setupError
              );
              
              return { 
                success: false, 
                error: setupError,
                message: `Failed to create storage bucket: ${setupError.message}`
              };
            }
            
            // Verify bucket was created
            const { error: verifyError } = await supabase.storage
              .from(BUCKET_ID)
              .list('', { limit: 1 });
              
            if (verifyError) {
              return { 
                success: false, 
                error: verifyError,
                message: `Storage bucket created but access verification failed.`
              };
            }
            
            logEvent({
              requestId,
              userId,
              eventType: 'bucket_created',
              component: 'ensureBucketAccess',
              message: `Successfully created ${BUCKET_ID} bucket`
            });
            
            return { success: true };
          } else {
            return { 
              success: false, 
              message: `Missing authentication session. Please log in again.`
            };
          }
        }
        
        return { 
          success: false, 
          error: error,
          message: `Storage access error: ${error.message}`
        };
      }
      
      // Bucket exists and we can access it
      logEvent({
        requestId,
        userId,
        eventType: 'bucket_access_success',
        component: 'ensureBucketAccess',
        message: 'Successfully verified bucket access'
      });
      
      return { success: true };
      
    } catch (permError) {
      logError(
        requestId,
        'ensureBucketAccess',
        'Storage access exception',
        permError
      );
      return { 
        success: false, 
        error: permError,
        message: `Exception during access check: ${permError instanceof Error ? permError.message : String(permError)}`
      };
    }
    
  } catch (error) {
    console.error('Error in ensureBucketAccess:', error);
    return { 
      success: false, 
      error,
      message: `Critical error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
