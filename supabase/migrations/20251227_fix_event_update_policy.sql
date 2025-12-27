-- URGENT FIX: Ensure users can update their own events (including event_date)
-- Issue: Date changes work on localhost but not production (Vercel)
-- Cause: RLS policy might be too restrictive

-- Drop and recreate the user update policy to ensure it's correct
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;

-- Create comprehensive update policy for event owners
CREATE POLICY "Users can update their own events" 
ON public.events 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure the policy covers ALL columns including event_date
COMMENT ON POLICY "Users can update their own events" ON public.events IS 
'Allows authenticated users to update ALL fields of their own events, including event_date, gallery, videos, etc.';
