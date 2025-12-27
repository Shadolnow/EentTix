-- Fix promo_codes RLS to avoid user_roles recursion
-- The problem: promo_codes policies don't need admin checks, they're simpler

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;

-- Recreate simple policies without role checks
-- Allow all authenticated users to create promo codes
CREATE POLICY "Authenticated users can create promo codes" 
ON public.promo_codes 
FOR INSERT 
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- Allow users to view and update their own promo codes
CREATE POLICY "Users can manage their own promo codes" 
ON public.promo_codes 
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow anyone to read promo codes (for validation during checkout)
CREATE POLICY "Anyone can read promo codes" 
ON public.promo_codes 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.promo_codes TO anon;
GRANT ALL ON public.promo_codes TO authenticated;
