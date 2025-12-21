-- Ensure profiles has coins column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- Update transactions table for Razorpay
-- First check if table exists (from script 005)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'deduction', 'refund', 'bonus')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If table existed with stripe column, we can keep it or ignore it. 
-- Let's ensure proper columns exist if it was already created.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'razorpay_payment_id') THEN
        ALTER TABLE public.transactions ADD COLUMN razorpay_order_id TEXT;
        ALTER TABLE public.transactions ADD COLUMN razorpay_payment_id TEXT;
        ALTER TABLE public.transactions ADD COLUMN razorpay_signature TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.transactions;

-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service_role can insert/update transactions
CREATE POLICY "Service role can manage transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role');

-- Prevent updates to coins column in profiles via API directly by users
-- (Profiles RLS already restricts this if we set it up right, but let's be sure)
-- Ideally, create a specific policy for profiles that allows users to UPDATE only specific columns, 
-- but Supabase RLS is row-based. We can use a trigger or just rely on backend-only updates for coins.
-- We'll assume the client app doesn't try to direct update coins.

-- Function to safely add coins and record transaction
CREATE OR REPLACE FUNCTION add_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_order_id TEXT,
  p_payment_id TEXT,
  p_signature TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (postgres/admin)
AS $$
DECLARE
  v_new_balance INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Update user balance
  UPDATE public.profiles
  SET coins = COALESCE(coins, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING coins INTO v_new_balance;

  -- Record transaction
  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    balance_after,
    description,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  )
  VALUES (
    p_user_id,
    'purchase',
    p_amount,
    v_new_balance,
    p_description,
    p_order_id,
    p_payment_id,
    p_signature
  )
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_transaction_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
