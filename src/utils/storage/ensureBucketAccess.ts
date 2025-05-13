
import { supabase } from "@/integrations/supabase/client";
import { logError, logEvent, generateRequestId } from "@/utils/logging";

export async function ensureBucketAccess(userId: string | undefined) {
  const requestId = generateRequestId();
  
  try {
    await logEvent({
      requestId,
      userId,
      eventType: 'ensure_bucket_access_start',
      component: 'ensureBucketAccess',
      message: 'Checking and ensuring bucket access',
      metadata: {},
      severity: 'info'
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
          await logError(
            requestId,
            'ensureBucketAccess',
            'Error creating org_chart bucket',
            createError,
            { userId },
            'error'
          );
          return { success: false, error: createError };
        } else {
          await logEvent({
            requestId,
            userId,
            eventType: 'bucket_created',
            component: 'ensureBucketAccess',
            message: 'Successfully created org_chart bucket',
            metadata: {},
            severity: 'info'
          });
        }
      } else {
        await logEvent({
          requestId,
          userId,
          eventType: 'bucket_exists',
          component: 'ensureBucketAccess',
          message: 'org_chart bucket already exists',
          metadata: { bucketData: data },
          severity: 'info'
        });
      }
      
      // Check for the presence of a test file to verify permissions
      const testFilePath = '_permission_test.txt';
      const testContent = 'This is a test file to verify bucket permissions';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      // Try to upload a test file
      const { error: uploadError } = await supabase.storage
        .from('org_chart')
        .upload(testFilePath, testFile, { upsert: true });
      
      if (uploadError) {
        await logError(
          requestId,
          'ensureBucketAccess',
          'Error uploading test file to verify permissions',
          uploadError,
          { userId, testFilePath },
          'warning'
        );
        
        return { 
          success: false, 
          error: uploadError,
          message: 'Failed permission test: ' + uploadError.message
        };
      }
      
      // Clean up test file
      await supabase.storage.from('org_chart').remove([testFilePath]);
      
      await logEvent({
        requestId,
        userId,
        eventType: 'permission_verified',
        component: 'ensureBucketAccess',
        message: 'Successfully verified write permissions to bucket',
        metadata: {},
        severity: 'info'
      });
      
      return { success: true };
    } catch (error) {
      await logError(
        requestId,
        'ensureBucketAccess',
        'Unexpected error checking bucket',
        error,
        { userId },
        'error'
      );
      return { success: false, error };
    }
  } catch (error) {
    console.error('Error in ensureBucketAccess:', error);
    return { success: false, error };
  }
}
