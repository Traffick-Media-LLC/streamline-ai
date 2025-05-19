
-- This function is deprecated as we now use direct SQL migrations
-- to create storage policies in a more reliable way.
CREATE OR REPLACE FUNCTION public.create_storage_policies(bucket_name text)
RETURNS TABLE (
  policy_name text,
  success boolean,
  message text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  policy_name := 'Deprecated';
  success := false;
  message := 'This function is deprecated. Storage policies are now created directly via SQL migrations.';
  RETURN NEXT;
  RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_storage_policies(text) TO authenticated;
