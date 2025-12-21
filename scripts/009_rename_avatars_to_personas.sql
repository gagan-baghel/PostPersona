-- Migration: Rename avatars table to personas and add ownership model
-- This is a significant schema change that renames the table and adds columns for ownership tracking

-- Step 1: Rename the avatars table to personas
ALTER TABLE IF EXISTS avatars RENAME TO personas;

-- Step 2: Add essential columns if they don't exist
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_app_provided BOOLEAN DEFAULT FALSE;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Step 3: Make user_id nullable to allow app-provided personas (which have no user owner)
ALTER TABLE personas ALTER COLUMN user_id DROP NOT NULL;

-- Step 4: Handle original_avatar_id -> original_persona_id rename safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'original_avatar_id') THEN
        ALTER TABLE personas RENAME COLUMN original_avatar_id TO original_persona_id;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'original_persona_id') THEN
        ALTER TABLE personas ADD COLUMN original_persona_id UUID REFERENCES personas(id);
    END IF;
END $$;

-- Step 5: Update the posts table foreign key reference
-- We recreate the constraint to point to personas
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_avatar_id_fkey;
ALTER TABLE posts RENAME COLUMN avatar_id TO persona_id;
ALTER TABLE posts 
  ADD CONSTRAINT posts_persona_id_fkey 
  FOREIGN KEY (persona_id) 
  REFERENCES personas(id) 
  ON DELETE SET NULL;

-- Step 6: Drop all existing RLS policies on personas
DROP POLICY IF EXISTS "Users can view their own avatars" ON personas;
DROP POLICY IF EXISTS "Users can insert their own avatars" ON personas;
DROP POLICY IF EXISTS "Users can update their own avatars" ON personas;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON personas;
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON personas;
DROP POLICY IF EXISTS "Allow reading suggested avatars" ON personas;
DROP POLICY IF EXISTS "Personas are viewable based on ownership and visibility" ON personas;
DROP POLICY IF EXISTS "Users can create their own personas" ON personas;
DROP POLICY IF EXISTS "Users can update their own personas" ON personas;
DROP POLICY IF EXISTS "Users can delete their own personas" ON personas;

-- Step 7: Create new RLS policies for personas table

-- SELECT policy: Users can view their own personas, app-provided personas, and public personas
CREATE POLICY "Personas are viewable based on ownership and visibility"
  ON personas FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR is_app_provided = TRUE 
    OR is_public = TRUE
  );

-- INSERT policy: Users can only insert their own personas (user_id must match auth.uid)
CREATE POLICY "Users can create their own personas"
  ON personas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy: Users can only update their own personas
CREATE POLICY "Users can update their own personas"
  ON personas FOR UPDATE
  USING (auth.uid() = user_id AND is_app_provided = FALSE);

-- DELETE policy: Users can only delete their own personas
CREATE POLICY "Users can delete their own personas"
  ON personas FOR DELETE
  USING (auth.uid() = user_id AND is_app_provided = FALSE);

-- Step 8: Clean up old system avatars (if any existed with magic UUIDs) and prepare for new ones
DELETE FROM personas WHERE user_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM personas WHERE is_app_provided = TRUE;

-- Step 9: Insert app-provided default personas
-- We use NULL for user_id to indicate these are system-owned/app-provided
INSERT INTO personas (
  id,
  user_id,
  name,
  title,
  personality,
  writing_style,
  avatar_url,
  is_public,
  is_app_provided,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  NULL, -- No user owner for app-provided personas
  'Professional Voice',
  'Corporate Leader',
  'Professional, polished, and authoritative. Values clarity, efficiency, and results. Speaks with confidence and expertise. Maintains composure under pressure and inspires trust.',
  'Clear, concise sentences. Uses data and facts to support points. Professional tone with strategic insights. Structured formatting with bullet points when appropriate. Avoids jargon unless contextually necessary.',
  null,
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'CEO Voice',
  'Chief Executive Officer',
  'Visionary, decisive, and inspiring. Thinks big picture while understanding operational details. Balances confidence with humility. Focuses on growth, innovation, and team empowerment.',
  'Bold, forward-looking statements. Uses "we" to emphasize team culture. Mixes strategic vision with practical insights. Shares lessons learned and company values. Inspires action and alignment.',
  null,
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Founder Voice',
  'Startup Entrepreneur',
  'Passionate, ambitious, and authentic. Embraces the journey with its ups and downs. Transparent about challenges and learnings. Deeply connected to the mission and customers.',
  'Storytelling approach with personal anecdotes. Energetic and motivational language. Uses metaphors and vision-driven narratives. Balances vulnerability with confidence. Celebrates small wins.',
  null,
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Thought Leader',
  'Industry Expert',
  'Insightful, analytical, and forward-thinking. Challenges conventional wisdom and sparks meaningful discussions. Backs opinions with research and experience. Curious and always learning.',
  'Deep-dive analysis with frameworks and models. Asks provocative questions. Balances theory with practical application. Uses data visualization descriptions. References industry trends and research.',
  null,
  true,
  true,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  NULL,
  'Recruiter Voice',
  'Talent Acquisition Expert',
  'Approachable, encouraging, and people-focused. Passionate about connecting talent with opportunity. Good listener who understands career aspirations. Celebrates professional growth.',
  'Warm and friendly tone. Uses questions to engage. Focuses on opportunities and growth potential. Includes calls-to-action. Highlights company culture and values.',
  null,
  true,
  true,
  NOW(),
  NOW()
);

-- Step 10: Clean up is_suggested column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personas' AND column_name = 'is_suggested') THEN
        ALTER TABLE personas DROP COLUMN is_suggested;
    END IF;
END $$;
