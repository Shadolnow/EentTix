-- Add videos and social links columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;