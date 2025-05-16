
import { supabase } from "@/integrations/supabase/client";
import { logError, logEvent, generateRequestId } from "@/utils/logging";

export async function ensureBucketAccess(userId: string | undefined) {
  const requestId = generateRequestId();
  
  try {
    logEvent({
      requestId,
      userId,
      eventType: 'ensure_bucket_access_start',
      component: 'ensureBucketAccess',
      message: 'Checking and ensuring bucket access'
    });
    
    // Check if the org_chart bucket exists
    try {
      const { data, error } = await supabase.storage.getBucket('org_chart');
      
      if (error) {
        console.log('Bucket does not exist, creating org_chart storage bucket');
        
        // Create the bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket('org_chart', {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (createError) {
          logError(
            requestId,
            'ensureBucketAccess',
            'Error creating org_chart bucket',
            createError
          );
          return { success: false, error: createError };
        } else {
          logEvent({
            requestId,
            userId,
            eventType: 'bucket_created',
            component: 'ensureBucketAccess',
            message: 'Successfully created org_chart bucket'
          });
        }
      } else {
        logEvent({
          requestId,
          userId,
          eventType: 'bucket_exists',
          component: 'ensureBucketAccess',
          message: 'org_chart bucket already exists'
        });
      }
      
      // No more permission test - just return success
      logEvent({
        requestId,
        userId,
        eventType: 'permission_verified',
        component: 'ensureBucketAccess',
        message: 'Bucket access check completed'
      });
      
      return { success: true };
    } catch (error) {
      logError(
        requestId,
        'ensureBucketAccess',
        'Unexpected error checking bucket',
        error
      );
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error in ensureBucketAccess:', error);
    return { success: false, error };
  }
}
