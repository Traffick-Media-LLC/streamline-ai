
-- This function retrieves storage policies for a given bucket
CREATE OR REPLACE FUNCTION public.get_storage_policies(bucket_name text)
RETURNS TABLE (
  name text,
  action text,
  definition text,
  command text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.policyname AS name,
    CASE 
      WHEN p.cmd = 'r' THEN 'SELECT'
      WHEN p.cmd = 'a' THEN 'INSERT'
      WHEN p.cmd = 'w' THEN 'UPDATE'
      WHEN p.cmd = 'd' THEN 'DELETE'
      WHEN p.cmd = '*' THEN 'ALL'
      ELSE p.cmd::text
    END AS action,
    pg_get_expr(p.qual, p.polrelid) AS definition,
    CASE 
      WHEN p.with_check IS NOT NULL THEN 'WITH CHECK'
      ELSE 'USING'
    END AS command
  FROM
    pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE
    n.nspname = 'storage'
    AND c.relname = 'objects'
    AND pg_get_expr(p.qual, p.polrelid) LIKE '%' || bucket_name || '%';
EXCEPTION
  WHEN insufficient_privilege THEN
    -- Return empty set when the user doesn't have access
    RETURN;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_storage_policies(text) TO authenticated;
