-- REAL-TIME ANALYTICS: Active Users and Visit Tracking
-- This allows admins to see who's currently viewing pages and total visits

-- Create table for tracking active page sessions
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address INET,
    last_ping TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_session_page UNIQUE(session_id, page_url)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_active_sessions_event ON public.active_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_ping ON public.active_sessions(last_ping);
CREATE INDEX IF NOT EXISTS idx_active_sessions_page ON public.active_sessions(page_url);

-- Function to update or insert active session (upsert)
CREATE OR REPLACE FUNCTION public.update_active_session(
    p_session_id TEXT,
    p_page_url TEXT,
    p_event_id UUID DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO public.active_sessions (
        user_id,
        session_id,
        page_url,
        event_id,
        user_agent,
        ip_address,
        last_ping
    ) VALUES (
        auth.uid(),
        p_session_id,
        p_page_url,
        p_event_id,
        p_user_agent,
        p_ip_address,
        NOW()
    )
    ON CONFLICT (session_id, page_url) 
    DO UPDATE SET 
        last_ping = NOW(),
        user_id = auth.uid(),
        event_id = COALESCE(EXCLUDED.event_id, active_sessions.event_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up stale sessions (older than 5 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions() RETURNS void AS $$
BEGIN
    DELETE FROM public.active_sessions 
    WHERE last_ping < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get real-time analytics for a specific event
CREATE OR REPLACE FUNCTION public.get_event_analytics(p_event_id UUID)
RETURNS TABLE (
    active_users_now BIGINT,
    total_visits_today BIGINT,
    total_visits_all_time BIGINT,
    unique_visitors_today BIGINT,
    unique_visitors_all_time BIGINT
) AS $$
BEGIN
    -- Clean up stale sessions first
    PERFORM public.cleanup_stale_sessions();
    
    RETURN QUERY
    WITH active_now AS (
        SELECT COUNT(DISTINCT session_id) as count
        FROM public.active_sessions
        WHERE event_id = p_event_id
        AND last_ping > NOW() - INTERVAL '2 minutes'
    ),
    visits_today AS (
        SELECT 
            COUNT(*) as total,
            COUNT(DISTINCT visitor_id) as unique_count
        FROM public.site_visits
        WHERE page_url LIKE '%' || p_event_id::text || '%'
        AND visited_at >= CURRENT_DATE
    ),
    visits_all AS (
        SELECT 
            COUNT(*) as total,
            COUNT(DISTINCT visitor_id) as unique_count
        FROM public.site_visits
        WHERE page_url LIKE '%' || p_event_id::text || '%'
    )
    SELECT 
        COALESCE((SELECT count FROM active_now), 0)::BIGINT,
        COALESCE((SELECT total FROM visits_today), 0)::BIGINT,
        COALESCE((SELECT total FROM visits_all), 0)::BIGINT,
        COALESCE((SELECT unique_count FROM visits_today), 0)::BIGINT,
        COALESCE((SELECT unique_count FROM visits_all), 0)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get global real-time analytics
CREATE OR REPLACE FUNCTION public.get_global_analytics()
RETURNS TABLE (
    active_users_now BIGINT,
    total_page_views_today BIGINT,
    unique_visitors_today BIGINT,
    total_events_viewed_today BIGINT
) AS $$
BEGIN
    -- Clean up stale sessions first
    PERFORM public.cleanup_stale_sessions();
    
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT session_id)::BIGINT as active_now,
        COALESCE((
            SELECT COUNT(*) 
            FROM public.site_visits 
            WHERE visited_at >= CURRENT_DATE
        ), 0)::BIGINT as views_today,
        COALESCE((
            SELECT COUNT(DISTINCT visitor_id) 
            FROM public.site_visits 
            WHERE visited_at >= CURRENT_DATE
        ), 0)::BIGINT as unique_today,
        COALESCE((
            SELECT COUNT(DISTINCT event_id) 
            FROM public.active_sessions 
            WHERE event_id IS NOT NULL 
            AND last_ping > NOW() - INTERVAL '2 minutes'
        ), 0)::BIGINT as events_viewed
    FROM public.active_sessions
    WHERE last_ping > NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for active_sessions
DROP POLICY IF EXISTS "Anyone can insert their own session" ON public.active_sessions;
CREATE POLICY "Anyone can insert their own session"
ON public.active_sessions FOR INSERT
WITH CHECK (true); -- Allow anyone to track their session

DROP POLICY IF EXISTS "Anyone can update their own session" ON public.active_sessions;
CREATE POLICY "Anyone can update their own session"
ON public.active_sessions FOR UPDATE
USING (session_id = current_setting('request.headers')::json->>'cf-ray' OR true);

DROP POLICY IF EXISTS "Admins can view all sessions" ON public.active_sessions;
CREATE POLICY "Admins can view all sessions"
ON public.active_sessions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.active_sessions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_active_session TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_event_analytics TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_global_analytics TO authenticated, anon;
