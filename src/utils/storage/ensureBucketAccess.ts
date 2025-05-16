
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
      message: 'Checking and ensuring bucket access'
    });
    
    // Check if the org_chart bucket exists
    try {
      const { data, error } = await supabase.storage.getBucket(BUCKET_ID);
      
      if (error) {
        console.log('Bucket does not exist, creating storage bucket', BUCKET_ID);
        
        // Create the bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket(BUCKET_ID, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (createError) {
          logError(
            requestId,
            'ensureBucketAccess',
            `Error creating bucket ${BUCKET_ID}`,
            createError
          );
          return { 
            success: false, 
            error: createError,
            message: `Failed to create bucket: ${createError.message}`
          };
        } else {
          logEvent({
            requestId,
            userId,
            eventType: 'bucket_created',
            component: 'ensureBucketAccess',
            message: `Successfully created ${BUCKET_ID} bucket`
          });
        }
      } else {
        logEvent({
          requestId,
          userId,
          eventType: 'bucket_exists',
          component: 'ensureBucketAccess',
          message: `${BUCKET_ID} bucket already exists`
        });
      }
      
      // Check if we have permission to upload to this bucket
      try {
        // Attempt a simple operation to verify permissions
        const testFilePath = `permission_test_${Date.now()}.txt`;
        const { error: testError } = await supabase.storage
          .from(BUCKET_ID)
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
              message: `You do not have permission to upload to the ${BUCKET_ID} bucket`,
              details: testError
            }
          };
        }
        
        // Clean up test file
        await supabase.storage.from(BUCKET_ID).remove([testFilePath]);
        
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
        return { 
          success: false, 
          error: permError,
          message: `Exception during permission test: ${permError instanceof Error ? permError.message : String(permError)}`
        };
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
      return { 
        success: false, 
        error,
        message: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
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
