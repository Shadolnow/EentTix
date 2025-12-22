-- Ensure payment_ref_id exists
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_ref_id TEXT;

-- Ensure payment_status exists
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tickets_payment_ref ON public.tickets(payment_ref_id);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
