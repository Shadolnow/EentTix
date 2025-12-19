-- Add payment_ref_id explicitly if missing
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_ref_id TEXT;

-- Also add payment_status if missing (just in case, though usually present)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Notify local schema cache that this change happened (Supabase client will auto-detect, but good to be explicit in migration log)
