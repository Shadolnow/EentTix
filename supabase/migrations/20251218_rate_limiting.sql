-- Create generic rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  identifier TEXT, -- e.g. email or user_id
  endpoint TEXT NOT NULL, -- e.g. 'send-otp', 'login'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optimize for lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON public.rate_limits(ip_address, endpoint, created_at);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier
ON public.rate_limits(identifier, endpoint, created_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow server-side insertion via functions/admin (or specific policies if needed)
-- We will use a SECURITY DEFINER function so we don't need to expose INSERT/SELECT to anon directly.

-- Function: Check and Log Rate Limit
-- Returns: TRUE if request is allowed, FALSE if limit exceeded
-- Also automatically logs the request if allowed (or properly tracks attempt)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_endpoint TEXT,
  p_identifier TEXT DEFAULT NULL, -- email etc.
  p_limit INTEGER DEFAULT 5, -- max requests
  p_window_minutes INTEGER DEFAULT 15 -- window in minutes
)
RETURNS JSONB -- { allowed: boolean, remaining: int, error: text }
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip_address TEXT;
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_is_allowed BOOLEAN;
BEGIN
  -- Get IP from current session (Supabase injects this in config)
  v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';
  
  -- Fallback if not found (e.g. direct call)
  IF v_ip_address IS NULL THEN
    v_ip_address := 'unknown';
  END IF;

  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;

  -- 1. Check IP Limit
  SELECT count(*) INTO v_count
  FROM public.rate_limits
  WHERE endpoint = p_endpoint
  AND ip_address = v_ip_address
  AND created_at > v_window_start;

  IF v_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Rate limit exceeded for this IP. Please try again later.'
    );
  END IF;

  -- 2. Check Identifier Limit (if provided)
  IF p_identifier IS NOT NULL THEN
    SELECT count(*) INTO v_count
    FROM public.rate_limits
    WHERE endpoint = p_endpoint
    AND identifier = p_identifier
    AND created_at > v_window_start;

    IF v_count >= p_limit THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'error', 'Rate limit exceeded for this email/user.'
      );
    END IF;
  END IF;

  -- 3. Log the request (Leaky bucket style - we log every attempt OR only successful ones? 
  -- Usually we log the attempt to Count it for future checks)
  INSERT INTO public.rate_limits (ip_address, identifier, endpoint)
  VALUES (v_ip_address, p_identifier, p_endpoint);

  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', p_limit - v_count - 1
  );
END;
$$;

-- Grant EXECUTE to public/anon so the API can call it
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;

-- Cleanup Function (can be scheduled via pg_cron if available, or called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.rate_limits
  WHERE created_at < (now() - INTERVAL '24 hours');
$$;
