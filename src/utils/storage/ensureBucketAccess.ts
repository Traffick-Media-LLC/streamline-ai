
import { supabase } from "@/integrations/supabase/client";
import { logError, logEvent, generateRequestId } from "@/utils/logging";

// Define a proper return type for the function
export interface BucketAccessResult {
  success: boolean;
  error?: any;
  message?: string;
}

export async function ensureBucketAccess(userId: string | undefined): Promise<BucketAccessResult> {
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
      
      // Check if we have permission to upload to this bucket
      try {
        // Attempt a simple operation to verify permissions
        const testFilePath = `permission_test_${Date.now()}.txt`;
        const { error: testError } = await supabase.storage
          .from('org_chart')
          .upload(testFilePath, new Blob(['test']), {
            upsert: true
          });
          
        if (testError) {
          logError(
            requestId,
            'ensureBucketAccess',
            'Storage permission test failed',
            testError
          );
          return { 
            success: false, 
            error: {
              message: 'You do not have permission to upload to this bucket',
              details: testError
            }
          };
        }
        
        // Clean up test file
        await supabase.storage.from('org_chart').remove([testFilePath]);
        
        logEvent({
          requestId,
          userId,
          eventType: 'permission_verified',
          component: 'ensureBucketAccess',
          message: 'Storage permission test successful'
        });
      } catch (permError) {
        logError(
          requestId,
          'ensureBucketAccess',
          'Storage permission test exception',
          permError
        );
        return { success: false, error: permError };
      }
      
      logEvent({
        requestId,
        userId,
        eventType: 'bucket_access_success',
        component: 'ensureBucketAccess',
        message: 'Bucket access check completed successfully'
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
