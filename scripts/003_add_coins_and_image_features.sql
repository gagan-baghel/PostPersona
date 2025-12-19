-- Add coins and LinkedIn features to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linkedin_access_token TEXT,
ADD COLUMN IF NOT EXISTS linkedin_profile_id TEXT;

-- Add image-related fields to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_preset TEXT,
ADD COLUMN IF NOT EXISTS posted_to_linkedin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;

-- Add avatar_type to support suggested/default avatars
ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'user_created' CHECK (avatar_type IN ('user_created', 'suggested', 'default'));

-- Create coin_transactions table for tracking coin usage
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on coin_transactions
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coin_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
