-- Create archived_tickets table for safe ticket deletion
CREATE TABLE IF NOT EXISTS archived_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original ticket data (copied from tickets table)
  original_ticket_id UUID NOT NULL,
  event_id UUID,
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_phone TEXT,
  ticket_code TEXT NOT NULL,
  tier_id UUID,
  tier_name TEXT,
  payment_ref_id TEXT,
  payment_status TEXT,
  payment_method TEXT,
  is_validated BOOLEAN DEFAULT FALSE,
  security_pin TEXT,
  batch_id UUID,
  quantity_in_batch INT,
  ticket_number_in_batch INT,
  
  -- Archive metadata
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_by UUID REFERENCES auth.users(id),
  deletion_reason TEXT,
  auto_delete_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '14 days',
  
  -- Original timestamps
  original_created_at TIMESTAMP WITH TIME ZONE,
  original_updated_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for fast lookups
CREATE INDEX idx_archived_tickets_event ON archived_tickets(event_id);
CREATE INDEX idx_archived_tickets_code ON archived_tickets(ticket_code);
CREATE INDEX idx_archived_tickets_archived_at ON archived_tickets(archived_at);
CREATE INDEX idx_archived_tickets_auto_delete ON archived_tickets(auto_delete_at);
CREATE INDEX idx_archived_tickets_batch ON archived_tickets(batch_id);

-- RLS Policies for archived_tickets
ALTER TABLE archived_tickets ENABLE ROW LEVEL SECURITY;

-- Admins can view archived tickets
CREATE POLICY "Admins can view archived tickets"
ON archived_tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Admins can insert to archive (during deletion)
CREATE POLICY "Admins can archive tickets"
ON archived_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Admins can delete from archive (during restoration or cleanup)
CREATE POLICY "Admins can delete archived tickets"
ON archived_tickets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

-- Function to archive tickets before deletion
CREATE OR REPLACE FUNCTION archive_ticket(ticket_id UUID, reason TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  archived_id UUID;
  ticket_record RECORD;
BEGIN
  -- Get the ticket to archive
  SELECT * INTO ticket_record FROM tickets WHERE id = ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found: %', ticket_id;
  END IF;
  
  -- Insert into archive
  INSERT INTO archived_tickets (
    original_ticket_id,
    event_id,
    attendee_name,
    attendee_email,
    attendee_phone,
    ticket_code,
    tier_id,
    tier_name,
    payment_ref_id,
    payment_status,
    payment_method,
    is_validated,
    security_pin,
    batch_id,
    quantity_in_batch,
    ticket_number_in_batch,
    archived_by,
    deletion_reason,
    original_created_at,
    original_updated_at
  ) VALUES (
    ticket_record.id,
    ticket_record.event_id,
    ticket_record.attendee_name,
    ticket_record.attendee_email,
    ticket_record.attendee_phone,
    ticket_record.ticket_code,
    ticket_record.tier_id,
    ticket_record.tier_name,
    ticket_record.payment_ref_id,
    ticket_record.payment_status,
    ticket_record.payment_method,
    ticket_record.is_validated,
    ticket_record.security_pin,
    ticket_record.batch_id,
    ticket_record.quantity_in_batch,
    ticket_record.ticket_number_in_batch,
    auth.uid(),
    reason,
    ticket_record.created_at,
    ticket_record.updated_at
  ) RETURNING id INTO archived_id;
  
  -- Delete from tickets table
  DELETE FROM tickets WHERE id = ticket_id;
  
  RETURN archived_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore ticket from archive
CREATE OR REPLACE FUNCTION restore_ticket(archived_ticket_id UUID)
RETURNS UUID AS $$
DECLARE
  restored_id UUID;
  archived_record RECORD;
BEGIN
  -- Get the archived ticket
  SELECT * INTO archived_record FROM archived_tickets WHERE id = archived_ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived ticket not found: %', archived_ticket_id;
  END IF;
  
  -- Restore to tickets table
  INSERT INTO tickets (
    event_id,
    attendee_name,
    attendee_email,
    attendee_phone,
    ticket_code,
    tier_id,
    tier_name,
    payment_ref_id,
    payment_status,
    payment_method,
    is_validated,
    security_pin,
    batch_id,
    quantity_in_batch,
    ticket_number_in_batch,
    created_at,
    updated_at
  ) VALUES (
    archived_record.event_id,
    archived_record.attendee_name,
    archived_record.attendee_email,
    archived_record.attendee_phone,
    archived_record.ticket_code,
    archived_record.tier_id,
    archived_record.tier_name,
    archived_record.payment_ref_id,
    archived_record.payment_status,
    archived_record.payment_method,
    archived_record.is_validated,
    archived_record.security_pin,
    archived_record.batch_id,
    archived_record.quantity_in_batch,
    archived_record.ticket_number_in_batch,
    archived_record.original_created_at,
    NOW()
  ) RETURNING id INTO restored_id;
  
  -- Remove from archive
  DELETE FROM archived_tickets WHERE id = archived_ticket_id;
  
  RETURN restored_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old archived tickets (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_archives()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM archived_tickets
  WHERE auto_delete_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE archived_tickets IS 'Stores deleted tickets for 14 days before permanent deletion. Allows admin recovery.';
COMMENT ON FUNCTION archive_ticket IS 'Archives a ticket by moving it to archived_tickets table and deleting from tickets.';
COMMENT ON FUNCTION restore_ticket IS 'Restores an archived ticket back to the tickets table.';
COMMENT ON FUNCTION cleanup_old_archives IS 'Permanently deletes archived tickets older than 14 days. Should be run daily via cron.';
