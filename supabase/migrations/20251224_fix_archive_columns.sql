-- Fix archived_tickets table to match actual tickets schema
-- Drop the old table and recreate with correct columns
DROP TABLE IF EXISTS archived_tickets CASCADE;

CREATE TABLE archived_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original ticket data (matching actual tickets table)
  original_ticket_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone TEXT,
  is_validated BOOLEAN,
  validated_at TIMESTAMP WITH TIME ZONE,
  payment_ref_id TEXT,
  payment_status TEXT,
  payment_method TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  tier_id UUID,
  batch_id UUID,
  quantity_in_batch INTEGER,
  ticket_number_in_batch INTEGER,
  security_pin TEXT,
  
  -- Archive metadata
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  deletion_reason TEXT,
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '14 days',
  
  -- Original timestamps
  original_created_at TIMESTAMP WITH TIME ZONE,
  original_updated_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE archived_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view archived tickets"
ON archived_tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can archive tickets"
ON archived_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete archived tickets"
ON archived_tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create indexes
CREATE INDEX idx_archived_tickets_event ON archived_tickets(event_id);
CREATE INDEX idx_archived_tickets_original ON archived_tickets(original_ticket_id);
CREATE INDEX idx_archived_auto_delete ON archived_tickets(auto_delete_at);

-- ============================================================================
-- FUNCTION: archive_ticket (FIXED)
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_ticket(ticket_id UUID, reason TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  ticket_record RECORD;
  archive_id UUID;
BEGIN
  -- Get the ticket to archive
  SELECT * INTO ticket_record
  FROM tickets
  WHERE id = ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  -- Insert into archived_tickets with correct columns
  INSERT INTO archived_tickets (
    original_ticket_id,
    event_id,
    ticket_code,
    attendee_name,
    attendee_email,
    attendee_phone,
    is_validated,
    validated_at,
    payment_ref_id,
    payment_status,
    payment_method,
    checked_in_at,
    tier_id,
    batch_id,
    quantity_in_batch,
    ticket_number_in_batch,
    security_pin,
    archived_by,
    deletion_reason,
    original_created_at
  ) VALUES (
    ticket_record.id,
    ticket_record.event_id,
    ticket_record.ticket_code,
    ticket_record.attendee_name,
    ticket_record.attendee_email,
    ticket_record.attendee_phone,
    ticket_record.is_validated,
    ticket_record.validated_at,
    ticket_record.payment_ref_id,
    ticket_record.payment_status,
    ticket_record.payment_method,
    ticket_record.checked_in_at,
    ticket_record.tier_id,
    ticket_record.batch_id,
    ticket_record.quantity_in_batch,
    ticket_record.ticket_number_in_batch,
    ticket_record.security_pin,
    auth.uid(),
    reason,
    ticket_record.created_at
  ) RETURNING id INTO archive_id;

  -- Delete the original ticket
  DELETE FROM tickets WHERE id = ticket_id;

  RETURN archive_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: restore_ticket (FIXED)
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_ticket(archived_ticket_id UUID)
RETURNS UUID AS $$
DECLARE
  archive_record RECORD;
  restored_ticket_id UUID;
BEGIN
  -- Get the archived ticket
  SELECT * INTO archive_record
  FROM archived_tickets
  WHERE id = archived_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived ticket not found';
  END IF;

  -- Restore to tickets table
  INSERT INTO tickets (
    id,
    event_id,
    ticket_code,
    attendee_name,
    attendee_email,
    attendee_phone,
    is_validated,
    validated_at,
    payment_ref_id,
    payment_status,
    payment_method,
    checked_in_at,
    tier_id,
    batch_id,
    quantity_in_batch,
    ticket_number_in_batch,
    security_pin,
    created_at
  ) VALUES (
    archive_record.original_ticket_id,
    archive_record.event_id,
    archive_record.ticket_code,
    archive_record.attendee_name,
    archive_record.attendee_email,
    archive_record.attendee_phone,
    archive_record.is_validated,
    archive_record.validated_at,
    archive_record.payment_ref_id,
    archive_record.payment_status,
    archive_record.payment_method,
    archive_record.checked_in_at,
    archive_record.tier_id,
    archive_record.batch_id,
    archive_record.quantity_in_batch,
    archive_record.ticket_number_in_batch,
    archive_record.security_pin,
    archive_record.original_created_at
  ) RETURNING id INTO restored_ticket_id;

  -- Delete from archive
  DELETE FROM archived_tickets WHERE id = archived_ticket_id;

  RETURN restored_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: cleanup_old_archives (unchanged)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_archives()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM archived_tickets
  WHERE auto_delete_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_ticket(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_ticket(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_archives() TO authenticated;
