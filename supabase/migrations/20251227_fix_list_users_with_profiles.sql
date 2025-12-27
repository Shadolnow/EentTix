-- Update list_all_users_admin to return profile data too
CREATE OR REPLACE FUNCTION public.list_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  account_type TEXT,
  company_name TEXT,
  plan_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at,
    COALESCE(p.account_type, 'individual') as account_type,
    p.company_name,
    COALESCE(p.plan_type, 'free') as plan_type
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC;
END;
$$;
