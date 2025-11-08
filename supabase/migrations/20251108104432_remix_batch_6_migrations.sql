
-- Migration: 20251106100901

-- Migration: 20251106092819
-- Create events table for storing bar events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  promotion_text TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tickets table for storing digital tickets with QR codes
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL UNIQUE,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view all events"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tickets
CREATE POLICY "Users can view tickets for their events"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.user_id = auth.uid()
    )
    OR true -- Allow public viewing for ticket holders
  );

CREATE POLICY "Users can create tickets for their events"
  ON public.tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tickets for their events"
  ON public.tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251106092856
-- Fix function search path security issue by recreating with proper settings
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251106105849
-- Add phone_number column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN attendee_phone text;

-- Add index for phone number lookups
CREATE INDEX idx_tickets_phone ON public.tickets(attendee_phone);

-- Migration: 20251107103903
-- Update events table to allow public read access
CREATE POLICY "Anyone can view events"
  ON public.events FOR SELECT
  USING (true);

-- Drop the old restrictive tickets SELECT policy
DROP POLICY IF EXISTS "Users can view tickets for their events" ON public.tickets;

-- Create new public policies for tickets
CREATE POLICY "Anyone can view tickets by ticket code"
  ON public.tickets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can claim tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (true);

-- Keep the update policy for event owners only (for validation)
-- This already exists and is correct;

-- Migration: 20251107104546
-- Add ticket pricing to events table
ALTER TABLE public.events
ADD COLUMN is_free boolean NOT NULL DEFAULT true,
ADD COLUMN ticket_price decimal(10,2) DEFAULT 0.00,
ADD COLUMN currency text DEFAULT 'USD';

-- Add index for filtering free events
CREATE INDEX idx_events_is_free ON public.events(is_free);

-- Migration: 20251108051622
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('individual', 'company')),
  company_name TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'paid')) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can view roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, account_type, company_name, plan_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual'),
    NEW.raw_user_meta_data->>'company_name',
    COALESCE(NEW.raw_user_meta_data->>'plan_type', 'free')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add ticket count tracking to events
ALTER TABLE public.events
  ADD COLUMN tickets_issued INTEGER NOT NULL DEFAULT 0;

-- Function to increment ticket count
CREATE OR REPLACE FUNCTION public.increment_ticket_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET tickets_issued = tickets_issued + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- Trigger to track ticket creation
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_ticket_count();

-- Migration: 20251108051645
-- Fix critical security issues with tickets table

-- Drop the insecure policies
DROP POLICY IF EXISTS "Anyone can view tickets by ticket code" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can claim tickets" ON public.tickets;

-- Create secure policy for public to claim FREE event tickets only
CREATE POLICY "Public can claim free event tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (
    -- Only allow claiming tickets for FREE events
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.is_free = true
    )
    -- OR allow event owners to create tickets for their own events
    OR EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Create secure RPC function for ticket holders to view their ticket
CREATE OR REPLACE FUNCTION public.get_ticket_by_code(ticket_code_input TEXT)
RETURNS TABLE (
  id UUID,
  ticket_code TEXT,
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_phone TEXT,
  is_validated BOOLEAN,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  event_id UUID,
  event_title TEXT,
  event_venue TEXT,
  event_date TIMESTAMPTZ,
  event_promotion_text TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id,
    t.ticket_code,
    t.attendee_name,
    t.attendee_email,
    t.attendee_phone,
    t.is_validated,
    t.validated_at,
    t.created_at,
    e.id as event_id,
    e.title as event_title,
    e.venue as event_venue,
    e.event_date,
    e.promotion_text as event_promotion_text
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.ticket_code = ticket_code_input
  LIMIT 1;
$$;

-- Event owners can view all tickets for their events
CREATE POLICY "Event owners can view their event tickets"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = tickets.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON public.tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
