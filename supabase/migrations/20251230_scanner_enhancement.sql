-- Migration: 20251230_scanner_enhancement.sql
-- Description: Add missing columns for tracking check-ins and payments

-- Phase 1: Database Update
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_ref_id TEXT;

-- Phase 2: Update RLS Policies
-- Allow event owners to manage ticket status
ALTER POLICY "Enable update for ticket owners and related event owners" ON public.tickets 
USING (
  auth.uid() IN (
    SELECT user_id FROM events WHERE id = event_id
  )
);

-- Ensure door staff can also update tickets they are assigned to
-- (This might require more complex RLS depending on how door_staff table works)
-- For now, let's stick to the event owner as per the plan.
