-- Create ticket_tiers table for multiple pricing options per event
CREATE TABLE public.ticket_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  capacity INTEGER,
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add tier_id to tickets table (nullable for backwards compatibility)
ALTER TABLE public.tickets ADD COLUMN tier_id UUID REFERENCES public.ticket_tiers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ticket_tiers
CREATE POLICY "Anyone can view active tiers" ON public.ticket_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Event owners can view all their tiers" ON public.ticket_tiers
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.events WHERE events.id = ticket_tiers.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Event owners can create tiers" ON public.ticket_tiers
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.events WHERE events.id = ticket_tiers.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Event owners can update their tiers" ON public.ticket_tiers
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.events WHERE events.id = ticket_tiers.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Event owners can delete their tiers" ON public.ticket_tiers
FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.events WHERE events.id = ticket_tiers.event_id AND events.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all tiers" ON public.ticket_tiers
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_ticket_tiers_updated_at
BEFORE UPDATE ON public.ticket_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment tier ticket count
CREATE OR REPLACE FUNCTION public.increment_tier_ticket_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tier_id IS NOT NULL THEN
    UPDATE public.ticket_tiers
    SET tickets_sold = tickets_sold + 1
    WHERE id = NEW.tier_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to increment tier count on ticket creation
CREATE TRIGGER increment_tier_count_on_ticket
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.increment_tier_ticket_count();

-- Function to check tier availability
CREATE OR REPLACE FUNCTION public.check_tier_availability(tier_id_input uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    CASE 
      WHEN t.capacity IS NULL THEN true
      ELSE t.tickets_sold < t.capacity
    END
  FROM public.ticket_tiers t
  WHERE t.id = tier_id_input AND t.is_active = true;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_tier_availability(uuid) TO authenticated, anon;

-- Enable realtime for ticket_tiers
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_tiers;