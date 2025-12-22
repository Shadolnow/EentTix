-- 1. Create Promo Codes Table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  min_purchase DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT discount_type_check CHECK (
    (discount_percent IS NOT NULL AND discount_amount IS NULL) OR
    (discount_percent IS NULL AND discount_amount IS NOT NULL)
  )
);

-- 2. Create Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_amount DECIMAL(10,2) DEFAULT 200,
  total_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Referral Uses Table
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_user_email TEXT NOT NULL,
  ticket_id UUID REFERENCES tickets(id),
  discount_applied DECIMAL(10,2),
  referrer_earned DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

-- 5. Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- 6. Define Policies (Wrapped to safely run multiple times)
DO $$ BEGIN
  CREATE POLICY "Promo codes are readable by everyone" ON promo_codes
    FOR SELECT USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage promo codes" ON promo_codes
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'::app_role
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their own referral codes" ON referral_codes
    FOR SELECT USING (user_id = auth.uid() OR is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own referral codes" ON referral_codes
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their referral uses" ON referral_uses
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM referral_codes 
        WHERE referral_codes.id = referral_uses.referral_code_id 
        AND referral_codes.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. Create Helper Functions
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_code_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes 
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION record_referral(
  p_referral_code TEXT,
  p_referred_email TEXT,
  p_ticket_id UUID,
  p_discount DECIMAL
)
RETURNS void AS $$
DECLARE
  v_referral_code_id UUID;
BEGIN
  SELECT id INTO v_referral_code_id 
  FROM referral_codes 
  WHERE code = p_referral_code AND is_active = true;
  
  IF v_referral_code_id IS NOT NULL THEN
    INSERT INTO referral_uses (referral_code_id, referred_user_email, ticket_id, discount_applied, referrer_earned)
    VALUES (v_referral_code_id, p_referred_email, p_ticket_id, p_discount, p_discount);
    
    UPDATE referral_codes 
    SET total_referrals = total_referrals + 1,
        total_earnings = total_earnings + p_discount
    WHERE id = v_referral_code_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Insert Sample Data (Corrected)
-- First, percentage-based codes
INSERT INTO promo_codes (code, discount_percent, discount_amount, max_uses, valid_until, is_active) 
VALUES
  ('LAUNCH10', 10, NULL, 100, NOW() + INTERVAL '30 days', true),
  ('WELCOME20', 20, NULL, 50, NOW() + INTERVAL '14 days', true)
ON CONFLICT (code) DO NOTHING;

-- Second, amount-based code (FLAT100)
INSERT INTO promo_codes (code, discount_percent, discount_amount, max_uses, valid_until, is_active) 
VALUES
  ('FLAT100', NULL, 100.00, 25, NOW() + INTERVAL '7 days', true)
ON CONFLICT (code) DO NOTHING;

-- 9. Force Cache Reload
NOTIFY pgrst, 'reload schema';
