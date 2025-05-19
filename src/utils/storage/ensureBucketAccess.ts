
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
    
    // Check if the user is authenticated
    if (!userId) {
      return { 
        success: false, 
        message: 'User is not authenticated. Please log in first.' 
      };
    }
    
    // Check if the org_chart bucket exists
    try {
      const { data, error } = await supabase.storage.getBucket(BUCKET_ID);
      
      if (error) {
        console.log('Bucket does not exist or not accessible, attempting to create storage bucket', BUCKET_ID);
        
        // Create the bucket if it doesn't exist
        const { error: createError } = await supabase.storage.createBucket(BUCKET_ID, {
          public: true, // Make bucket public
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (createError) {
          logError(
            requestId,
            'ensureBucketAccess',
            `Error creating bucket ${BUCKET_ID}`,
            createError
          );
          
          // Special handling for permission denied errors
          if (createError.message.includes('permission denied')) {
            return { 
              success: false, 
              error: createError,
              message: `You don't have permission to create the ${BUCKET_ID} bucket. This may require admin privileges.`
            };
          }
          
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
          
          // Special handling for RLS policy errors
          if (testError.message?.includes('new row violates row level security policy')) {
            return { 
              success: false, 
              error: testError,
              message: `RLS Policy Error: You don't have permission to upload to the ${BUCKET_ID} bucket. The bucket exists, but you need proper permissions.`
            };
          }
          
          return { 
            success: false, 
            error: testError,
            message: `You do not have permission to upload to the ${BUCKET_ID} bucket`
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
