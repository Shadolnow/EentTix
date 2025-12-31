-- Migration: Add waitlist automation for sold-out events
-- Customers can join waitlist and get auto-notified when tickets become available

-- Create waitlist table
CREATE TABLE IF NOT EXISTS public.event_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  position INTEGER NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_email)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_waitlist_event ON public.event_waitlist(event_id, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_position ON public.event_waitlist(event_id, position);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.event_waitlist(user_email);

-- Function to auto-assign position in waitlist
CREATE OR REPLACE FUNCTION assign_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign the next position number
  NEW.position := (
    SELECT COALESCE(MAX(position), 0) + 1
    FROM public.event_waitlist
    WHERE event_id = NEW.event_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign position before insert
CREATE TRIGGER assign_waitlist_position_trigger
BEFORE INSERT ON public.event_waitlist
FOR EACH ROW
EXECUTE FUNCTION assign_waitlist_position();

-- Function to get waitlist summary for event
CREATE OR REPLACE FUNCTION get_waitlist_summary(p_event_id UUID)
RETURNS TABLE (
  total_waiting INTEGER,
  total_notified INTEGER,
  total_converted INTEGER,
  next_position INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'waiting')::INTEGER as total_waiting,
    COUNT(*) FILTER (WHERE status = 'notified')::INTEGER as total_notified,
    COUNT(*) FILTER (WHERE status = 'converted')::INTEGER as total_converted,
    (COALESCE(MAX(position), 0) + 1)::INTEGER as next_position
  FROM public.event_waitlist
  WHERE event_id = p_event_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.event_waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can join waitlist
CREATE POLICY "Anyone can join waitlist"
ON public.event_waitlist FOR INSERT
WITH CHECK (true);

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries"
ON public.event_waitlist FOR SELECT
USING (user_email = auth.jwt() ->> 'email');

-- Event creators can view all waitlist for their events
CREATE POLICY "Event creators can view event waitlist"
ON public.event_waitlist FOR SELECT
USING (
  event_id IN (
    SELECT id FROM public.events
    WHERE user_id = auth.uid()
  )
);

-- Event creators can update waitlist status
CREATE POLICY "Event creators can update waitlist"
ON public.event_waitlist FOR UPDATE
USING (
  event_id IN (
    SELECT id FROM public.events
    WHERE user_id = auth.uid()
  )
);

-- Add comments
COMMENT ON TABLE public.event_waitlist IS 'Waitlist for sold-out events - auto-notify when tickets available';
COMMENT ON COLUMN public.event_waitlist.position IS 'Position in queue (FIFO)';
COMMENT ON COLUMN public.event_waitlist.status IS 'waiting=in queue, notified=email sent, converted=booked ticket, expired=didnt book';
