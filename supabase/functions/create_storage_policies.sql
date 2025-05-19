
-- This function creates storage policies for a given bucket
CREATE OR REPLACE FUNCTION public.create_storage_policies(bucket_name text)
RETURNS TABLE (
  policy_name text,
  success boolean,
  message text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  policy_result RECORD;
BEGIN
  -- Create base RLS policy for authenticated users to view objects
  BEGIN
    CREATE POLICY "Allow authenticated users to view objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = bucket_name);
    
    policy_name := 'Allow authenticated users to view objects';
    success := true;
    message := 'Policy created successfully';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    policy_name := 'Allow authenticated users to view objects';
    success := false;
    message := 'Error creating policy: ' || SQLERRM;
    RETURN NEXT;
  END;
  
  -- Create policy for inserting objects for authenticated users
  BEGIN
    CREATE POLICY "Allow authenticated users to upload objects"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = bucket_name);
    
    policy_name := 'Allow authenticated users to upload objects';
    success := true;
    message := 'Policy created successfully';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    policy_name := 'Allow authenticated users to upload objects';
    success := false;
    message := 'Error creating policy: ' || SQLERRM;
    RETURN NEXT;
  END;
  
  -- Create policy for admin users to manage all objects
  BEGIN
    CREATE POLICY "Allow admin users to manage all objects"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = bucket_name AND (auth.uid() IN (
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    )));
    
    policy_name := 'Allow admin users to manage all objects';
    success := true;
    message := 'Policy created successfully';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    policy_name := 'Allow admin users to manage all objects';
    success := false;
    message := 'Error creating policy: ' || SQLERRM;
    RETURN NEXT;
  END;
  
  -- Create policy for public access if bucket is public
  BEGIN
    CREATE POLICY "Allow public access to bucket"
    ON storage.objects
    FOR SELECT
    TO anon
    USING (bucket_id = bucket_name);
    
    policy_name := 'Allow public access to bucket';
    success := true;
    message := 'Policy created successfully';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    policy_name := 'Allow public access to bucket';
    success := false;
    message := 'Error creating policy: ' || SQLERRM;
    RETURN NEXT;
  END;

  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_storage_policies(text) TO authenticated;
