-- Add discount percentage field to events table
-- This allows event organizers to set a blanket discount on all tickets

DO $$
BEGIN
    -- Add discount_percent column to events table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'discount_percent'
    ) THEN
        ALTER TABLE public.events 
        ADD COLUMN discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100);
        
        COMMENT ON COLUMN public.events.discount_percent IS 'Global discount percentage applied to all tickets for this event (0-100)';
    END IF;
END $$;
