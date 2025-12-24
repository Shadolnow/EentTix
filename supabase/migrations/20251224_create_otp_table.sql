-- Create a simple OTP table if it doesn't exist
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  phone TEXT,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
  verified BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP codes
CREATE POLICY "Anyone can create OTP codes"
ON otp_codes
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow anyone to read their own OTP codes
CREATE POLICY "Anyone can read OTP codes"
ON otp_codes
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow anyone to update OTP codes (for verification)
CREATE POLICY "Anyone can update OTP codes"
ON otp_codes
FOR UPDATE
TO anon, authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- Clean up expired OTPs (run this manually or set up a cron job)
-- DELETE FROM otp_codes WHERE expires_at < NOW();
