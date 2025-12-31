-- Migration: Add social authentication support to profiles
-- Run this in Supabase SQL Editor

-- Add social auth columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email',
ADD COLUMN IF NOT EXISTS social_avatar_url TEXT,
ADD COLUMN IF NOT EXISTS social_metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for faster auth provider lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider 
ON public.profiles(auth_provider);

-- Update existing profiles to set auth_provider
UPDATE public.profiles
SET auth_provider = 'email'
WHERE auth_provider IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.auth_provider IS 'Authentication provider: email, google, facebook, etc.';
COMMENT ON COLUMN public.profiles.social_avatar_url IS 'Profile picture URL from social provider';
COMMENT ON COLUMN public.profiles.social_metadata IS 'Additional data from social provider (JSON)';
