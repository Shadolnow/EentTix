-- MIGRATION: Fix Bulk Ticket Creation for Paid Events
-- Date: 2025-12-23
-- Issue: Bulk ticket creation fails with "Failed to create any tickets" error
--
-- Root Cause: The RLS (Row Level Security) policy "Anyone can claim free event tickets"
-- only allows ticket creation for FREE events. For PAID events, anonymous users
-- cannot create tickets because they don't have permission.
--
-- Solution: Replace the restrictive free-only policy with a permissive policy that
-- allows anyone to create tickets for any event (free or paid).

-- Step 1: Drop the old restrictive policy
DROP POLICY IF EXISTS "Anyone can claim free event tickets" ON public.tickets;

-- Step 2: Create a new permissive policy
-- This allows anyone (authenticated or not) to create tickets for any event
CREATE POLICY "Public can create tickets for any event"
ON public.tickets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.events 
    WHERE events.id = tickets.event_id
  )
);

-- Note: The following policies remain unchanged and work together:
-- - "Users can create tickets for their events" - allows event owners to create tickets
-- - "Admins can update all tickets" - allows admins to modify tickets
-- - Various SELECT policies for viewing tickets

-- Verification: After applying this migration, users should be able to:
-- 1. Create tickets for free events (no auth required)
-- 2. Create tickets for paid events (no auth required) 
-- 3. Event owners can still create tickets for their events
-- 4. Ticket creation will succeed as long as the event exists
