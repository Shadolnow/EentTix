-- ============================================
-- COMPLETE SCHEMA FIX FOR NEW SUPABASE PROJECT
-- ============================================
-- This migration adds all missing columns to match the working schema
-- Run this on: xwjjbfzvakzvidudsstt.supabase.co

-- ============================================
-- PHASE 1: Add Missing Columns to tickets table
-- ============================================

-- Payment tracking columns
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_ref_id TEXT DEFAULT NULL;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL;

-- Bulk purchase tracking
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS batch_id TEXT DEFAULT NULL;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS quantity_in_batch INTEGER DEFAULT 1;

ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS ticket_number_in_batch INTEGER DEFAULT 1;

-- Security
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS security_pin TEXT DEFAULT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tickets_checked_in_at ON public.tickets(checked_in_at);
CREATE INDEX IF NOT EXISTS idx_tickets_payment_status ON public.tickets(payment_status);
CREATE INDEX IF NOT EXISTS idx_tickets_batch_id ON public.tickets(batch_id);
CREATE INDEX IF NOT EXISTS idx_tickets_security_pin ON public.tickets(security_pin);

-- ============================================
-- PHASE 2: Create door_staff table
-- ============================================

CREATE TABLE IF NOT EXISTS public.door_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  is_active BOOLEAN DEFAULT TRUE,
  last_scan_at TIMESTAMPTZ,
  total_scans INTEGER DEFAULT 0,
  UNIQUE(event_id, user_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_door_staff_event ON public.door_staff(event_id);
CREATE INDEX IF NOT EXISTS idx_door_staff_code ON public.door_staff(access_code);
CREATE INDEX IF NOT EXISTS idx_door_staff_email ON public.door_staff(user_email);
CREATE INDEX IF NOT EXISTS idx_door_staff_active ON public.door_staff(is_active, expires_at);

-- ============================================
-- PHASE 3: Create archived_tickets table
-- ============================================

CREATE TABLE IF NOT EXISTS public.archived_tickets (
  id UUID PRIMARY KEY,
  event_id UUID,
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_phone TEXT,
  ticket_code TEXT,
  is_validated BOOLEAN,
  validated_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  tier_id UUID,
  payment_status TEXT,
  payment_ref_id TEXT,
  payment_method TEXT,
  security_pin TEXT,
  batch_id TEXT,
  quantity_in_batch INTEGER,
  ticket_number_in_batch INTEGER,
  created_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_archived_tickets_event ON public.archived_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_archived_tickets_code ON public.archived_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_archived_tickets_archived_at ON public.archived_tickets(archived_at);

-- ============================================
-- PHASE 4: Create audit_logs table
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  ticket_id UUID,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket ON public.audit_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- ============================================
-- PHASE 5: RLS Policies for new tables
-- ============================================

-- door_staff RLS
ALTER TABLE public.door_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can manage door staff"
ON public.door_staff
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = door_staff.event_id
    AND events.user_id = auth.uid()
  )
);

-- archived_tickets RLS
ALTER TABLE public.archived_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view archived tickets"
ON public.archived_tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = archived_tickets.event_id
    AND events.user_id = auth.uid()
  )
);

-- audit_logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = audit_logs.event_id
    AND events.user_id = auth.uid()
  )
);

-- ============================================
-- PHASE 6: Database Functions
-- ============================================

-- Function to archive a ticket
CREATE OR REPLACE FUNCTION archive_ticket(
  p_ticket_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  -- Get ticket details
  SELECT * INTO v_ticket
  FROM tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Insert into archived_tickets
  INSERT INTO archived_tickets (
    id, event_id, attendee_name, attendee_email, attendee_phone,
    ticket_code, is_validated, validated_at, checked_in_at,
    tier_id, payment_status, payment_ref_id, payment_method,
    security_pin, batch_id, quantity_in_batch, ticket_number_in_batch,
    created_at, archived_by, archive_reason
  )
  VALUES (
    v_ticket.id, v_ticket.event_id, v_ticket.attendee_name,
    v_ticket.attendee_email, v_ticket.attendee_phone, v_ticket.ticket_code,
    v_ticket.is_validated, v_ticket.validated_at, v_ticket.checked_in_at,
    v_ticket.tier_id, v_ticket.payment_status, v_ticket.payment_ref_id,
    v_ticket.payment_method, v_ticket.security_pin, v_ticket.batch_id,
    v_ticket.quantity_in_batch, v_ticket.ticket_number_in_batch,
    v_ticket.created_at, auth.uid(), p_reason
  );

  -- Delete from active tickets
  DELETE FROM tickets WHERE id = p_ticket_id;

  -- Log action
  INSERT INTO audit_logs (event_id, ticket_id, action, performed_by, details)
  VALUES (
    v_ticket.event_id,
    p_ticket_id,
    'ARCHIVE',
    auth.uid(),
    jsonb_build_object('reason', p_reason, 'ticket_code', v_ticket.ticket_code)
  );

  RETURN TRUE;
END;
$$;

-- Function to restore a ticket
CREATE OR REPLACE FUNCTION restore_ticket(
  p_ticket_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  -- Get archived ticket details
  SELECT * INTO v_ticket
  FROM archived_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Insert back into tickets
  INSERT INTO tickets (
    id, event_id, attendee_name, attendee_email, attendee_phone,
    ticket_code, is_validated, validated_at, checked_in_at,
    tier_id, payment_status, payment_ref_id, payment_method,
    security_pin, batch_id, quantity_in_batch, ticket_number_in_batch,
    created_at
  )
  VALUES (
    v_ticket.id, v_ticket.event_id, v_ticket.attendee_name,
    v_ticket.attendee_email, v_ticket.attendee_phone, v_ticket.ticket_code,
    v_ticket.is_validated, v_ticket.validated_at, v_ticket.checked_in_at,
    v_ticket.tier_id, v_ticket.payment_status, v_ticket.payment_ref_id,
    v_ticket.payment_method, v_ticket.security_pin, v_ticket.batch_id,
    v_ticket.quantity_in_batch, v_ticket.ticket_number_in_batch,
    v_ticket.created_at
  );

  -- Delete from archived
  DELETE FROM archived_tickets WHERE id = p_ticket_id;

  -- Log action
  INSERT INTO audit_logs (event_id, ticket_id, action, performed_by, details)
  VALUES (
    v_ticket.event_id,
    p_ticket_id,
    'RESTORE',
    auth.uid(),
    jsonb_build_object('ticket_code', v_ticket.ticket_code)
  );

  RETURN TRUE;
END;
$$;

-- Function to generate access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM door_staff WHERE access_code = code) INTO code_exists;
    IF NOT code_exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;

-- Function to validate door staff access
CREATE OR REPLACE FUNCTION validate_door_staff_access(
  p_access_code TEXT,
  p_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  staff_id UUID,
  event_id UUID,
  user_email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (ds.is_active AND ds.expires_at > NOW()) AS is_valid,
    ds.id AS staff_id,
    ds.event_id,
    ds.user_email,
    ds.expires_at
  FROM door_staff ds
  WHERE ds.access_code = p_access_code
    AND (p_event_id IS NULL OR ds.event_id = p_event_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_ticket(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_access_code() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_door_staff_access(TEXT, UUID) TO anon, authenticated;

-- ============================================
-- PHASE 7: Update RLS policies on tickets table
-- ============================================

-- Allow authenticated users to update payment status and check-in
DROP POLICY IF EXISTS "Users can update their event tickets" ON public.tickets;

CREATE POLICY "Event owners can manage tickets"
ON public.tickets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = tickets.event_id
    AND events.user_id = auth.uid()
  )
);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this migration:
-- 1. All missing columns will be added
-- 2. All required tables will be created  
-- 3. All RLS policies will be in place
-- 4. All database functions will be available
