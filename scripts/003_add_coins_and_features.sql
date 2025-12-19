-- Add coins system to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Add image and LinkedIn fields to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_prompt TEXT,
ADD COLUMN IF NOT EXISTS image_preset TEXT,
ADD COLUMN IF NOT EXISTS posted_to_linkedin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT;

-- Add avatar type for suggested/explore avatars
ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS avatar_type TEXT DEFAULT 'user_created' CHECK (avatar_type IN ('user_created', 'suggested', 'default'));

-- Create coin transactions table for tracking
CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('post_generation', 'image_generation', 'purchase', 'refund')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for coin transactions
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (true);
