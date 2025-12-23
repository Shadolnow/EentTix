-- 1. Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public can create tickets for any event" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can claim free event tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public can view tickets" ON public.tickets;

-- 2. Allow Guests (Anon) and Logged In users to CREATE tickets unconditionally
-- (Validity is enforced by Foreign Key to Event ID)
CREATE POLICY "Public can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (true);

-- 3. Allow Guests (Anon) to VIEW ticket details (Needed to receive the generated ticket)
CREATE POLICY "Public can view tickets"
ON public.tickets
FOR SELECT
USING (true);

-- 4. Ensure Permissions are Granted
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.tickets TO anon, authenticated;
