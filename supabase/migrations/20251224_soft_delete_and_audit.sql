-- Soft Delete & Archive System
-- Part 1: Add soft delete columns

-- Add deleted_at to tickets and events
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Part 2: Audit Logging Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Part 3: Archive Tables
CREATE TABLE IF NOT EXISTS archived_tickets (
  id UUID PRIMARY KEY,
  original_data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL,
  deleted_by UUID REFERENCES auth.users(id),
  restore_before TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS archived_events (
  id UUID PRIMARY KEY,
  original_data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL,
  deleted_by UUID REFERENCES auth.users(id),
  restore_before TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Part 4: Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_deleted_at ON tickets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON events(deleted_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_tickets_restore_before ON archived_tickets(restore_before);
CREATE INDEX IF NOT EXISTS idx_archived_events_restore_before ON archived_events(restore_before);

-- Part 5: RLS Policies for Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Part 6: Functions

-- Function to soft delete ticket
CREATE OR REPLACE FUNCTION soft_delete_ticket(ticket_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  ticket_data JSONB;
BEGIN
  -- Get ticket data
  SELECT to_jsonb(tickets.*) INTO ticket_data
  FROM tickets
  WHERE id = ticket_id AND deleted_at IS NULL;
  
  IF ticket_data IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Archive the ticket
  INSERT INTO archived_tickets (id, original_data, deleted_at, deleted_by, restore_before)
  VALUES (
    ticket_id,
    ticket_data,
    NOW(),
    auth.uid(),
    NOW() + INTERVAL '7 days'
  );
  
  -- Soft delete
  UPDATE tickets
  SET deleted_at = NOW()
  WHERE id = ticket_id;
  
  -- Log the action
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
  VALUES (auth.uid(), 'SOFT_DELETE', 'tickets', ticket_id, ticket_data);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore ticket
CREATE OR REPLACE FUNCTION restore_ticket(ticket_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  archive_record RECORD;
BEGIN
  -- Check if ticket is in archive and within restore period
  SELECT * INTO archive_record
  FROM archived_tickets
  WHERE id = ticket_id AND restore_before > NOW();
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Restore the ticket
  UPDATE tickets
  SET deleted_at = NULL
  WHERE id = ticket_id;
  
  -- Remove from archive
  DELETE FROM archived_tickets WHERE id = ticket_id;
  
  -- Log the action
  INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data)
  VALUES (auth.uid(), 'RESTORE', 'tickets', ticket_id, archive_record.original_data);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete expired archives
CREATE OR REPLACE FUNCTION cleanup_expired_archives()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Permanently delete expired ticket archives
  WITH deleted AS (
    DELETE FROM archived_tickets
    WHERE restore_before < NOW()
    RETURNING id, original_data
  )
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data)
  SELECT NULL, 'PERMANENT_DELETE', 'tickets', id, original_data
  FROM deleted;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Permanently delete tickets that are past restore period
  DELETE FROM tickets
  WHERE id IN (
    SELECT id FROM archived_tickets WHERE restore_before < NOW()
  );
  
  -- Same for events
  DELETE FROM archived_events WHERE restore_before < NOW();
  DELETE FROM events
  WHERE id IN (
    SELECT id FROM archived_events WHERE restore_before < NOW()
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 7: Update existing queries to exclude soft-deleted records
-- Create a view for active tickets
CREATE OR REPLACE VIEW active_tickets AS
SELECT * FROM tickets WHERE deleted_at IS NULL;

-- Create a view for active events
CREATE OR REPLACE VIEW active_events AS
SELECT * FROM events WHERE deleted_at IS NULL;

-- Part 8: Scheduled cleanup (run via cron job)
-- Note: You'll need to call cleanup_expired_archives() daily via Supabase Edge Functions

COMMENT ON FUNCTION soft_delete_ticket IS 'Soft deletes a ticket and archives it for 7 days';
COMMENT ON FUNCTION restore_ticket IS 'Restores a soft-deleted ticket within the 7-day window';
COMMENT ON FUNCTION cleanup_expired_archives IS 'Permanently deletes archives older than 7 days - run daily';
