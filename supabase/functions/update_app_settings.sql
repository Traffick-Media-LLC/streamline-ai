
-- Create a secure function to update app_settings
-- This function will be used by admins to update app settings
CREATE OR REPLACE FUNCTION public.update_app_settings(
  setting_id TEXT,
  setting_value JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: Only administrators can update application settings';
  END IF;

  -- Update or insert the setting
  INSERT INTO public.app_settings (id, value, updated_at)
  VALUES (setting_id, setting_value, now())
  ON CONFLICT (id) 
  DO UPDATE SET 
    value = setting_value,
    updated_at = now();
    
  RETURN TRUE;
EXCEPTION
  WHEN others THEN
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
-- The function's SECURITY DEFINER will ensure only admins can successfully execute it
GRANT EXECUTE ON FUNCTION public.update_app_settings(TEXT, JSONB) TO authenticated;
