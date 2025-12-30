-- Create site_visits table to track unique visitors and page views
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT, -- Persistent ID stored in localStorage
    page_path TEXT NOT NULL,
    referrer TEXT,
    user_agent TEXT,
    ip_hash TEXT, -- Storing hash for privacy while allowing unique count
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (anyone can trigger a visit record)
CREATE POLICY "Allow anonymous inserts to site_visits"
ON public.site_visits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins/authenticated users (owners) can view stats
CREATE POLICY "Allow authenticated users to view site_visits"
ON public.site_visits
FOR SELECT
TO authenticated
USING (true);

-- Create index for performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_site_visits_page_path ON public.site_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON public.site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor_id ON public.site_visits(visitor_id);

-- Function to get visit stats
CREATE OR REPLACE FUNCTION get_site_statistics(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
    total_views BIGINT,
    unique_visitors BIGINT,
    top_pages JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as views,
            COUNT(DISTINCT visitor_id) as visitors
        FROM public.site_visits
        WHERE created_at >= start_date AND created_at <= end_date
    ),
    pages AS (
        SELECT 
            jsonb_agg(jsonb_build_object('path', page_path, 'count', page_count)) as top
        FROM (
            SELECT page_path, COUNT(*) as page_count
            FROM public.site_visits
            WHERE created_at >= start_date AND created_at <= end_date
            GROUP BY page_path
            ORDER BY page_count DESC
            LIMIT 10
        ) p
    )
    SELECT 
        s.views,
        s.visitors,
        COALESCE(p.top, '[]'::jsonb)
    FROM stats s, pages p;
END;
$$;
