-- Add security_pin column to tickets table for ticket retrieval verification
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS security_pin TEXT;

-- Add index for faster PIN lookups
CREATE INDEX IF NOT EXISTS idx_tickets_security_pin ON tickets(security_pin);

-- Comment explaining the security enhancement
COMMENT ON COLUMN tickets.security_pin IS 'Secret PIN (4-6 digits) required along with email and phone to retrieve tickets. Provides 3-factor security for ticket access.';
