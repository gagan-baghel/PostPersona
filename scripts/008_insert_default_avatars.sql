-- Insert default avatars that appear in Explore for all users
-- These avatars are marked as is_suggested = true and should always be visible in Explore

-- First, create a dummy user ID for system avatars (if needed)
-- Or we can use a specific UUID for system-owned avatars

-- Professional Avatar
INSERT INTO avatars (
  id,
  user_id,
  name,
  title,
  personality,
  writing_style,
  avatar_url,
  is_suggested,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user ID (no real user owns this)
  'Professional Voice',
  'Corporate Leader',
  'Professional, polished, and authoritative. Values clarity, efficiency, and results. Speaks with confidence and expertise.',
  'Clear, concise sentences. Uses data and facts. Professional tone with occasional strategic insights. Avoids jargon unless necessary.',
  null,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Founder Voice Avatar
INSERT INTO avatars (
  id,
  user_id,
  name,
  title,
  personality,
  writing_style,
  avatar_url,
  is_suggested,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'Founder Voice',
  'Startup Entrepreneur',
  'Visionary, ambitious, and inspiring. Passionate about innovation and building the future. Embraces challenges and shares lessons learned.',
  'Storytelling approach. Personal anecdotes mixed with insights. Energetic and motivational. Uses metaphors and vision-driven language.',
  null,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Recruiter Voice Avatar
INSERT INTO avatars (
  id,
  user_id,
  name,
  title,
  personality,
  writing_style,
  avatar_url,
  is_suggested,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'Recruiter Voice',
  'Talent Acquisition Expert',
  'Approachable, encouraging, and people-focused. Passionate about career growth and opportunities. Skilled at connecting with professionals.',
  'Warm and friendly. Uses questions to engage. Focuses on opportunities and growth. Includes calls-to-action and encouragement.',
  null,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Thought Leader Avatar
INSERT INTO avatars (
  id,
  user_id,
  name,
  title,
  personality,
  writing_style,
  avatar_url,
  is_suggested,
  is_public,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'Thought Leader',
  'Industry Expert',
  'Insightful, analytical, and forward-thinking. Challenges conventional wisdom and sparks meaningful discussions. Values depth over breadth.',
  'Deep-dive analysis. Asks provocative questions. Uses frameworks and models. Balances theory with practical application.',
  null,
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Update RLS policy to allow reading suggested avatars
-- This ensures the system-owned avatars are readable by all authenticated users
DROP POLICY IF EXISTS "Allow reading suggested avatars" ON avatars;
CREATE POLICY "Allow reading suggested avatars"
  ON avatars FOR SELECT
  USING (is_suggested = true OR is_public = true OR auth.uid() = user_id);
