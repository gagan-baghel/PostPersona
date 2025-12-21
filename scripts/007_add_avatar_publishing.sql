-- Add avatar publishing and cloning fields
-- This migration enables users to publish their avatars publicly
-- and allows tracking of cloned avatars

-- Add is_public field for user-published avatars
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add original_avatar_id to track cloned avatars
ALTER TABLE avatars ADD COLUMN IF NOT EXISTS original_avatar_id UUID REFERENCES avatars(id);

-- Update RLS policy to allow reading public avatars
-- This allows users to see suggested avatars and avatars published by other users
DROP POLICY IF EXISTS "Public avatars are viewable by everyone" ON avatars;
CREATE POLICY "Public avatars are viewable by everyone"
  ON avatars FOR SELECT
  USING (is_suggested = TRUE OR is_public = TRUE OR auth.uid() = user_id);

-- Policy for inserting avatars (cloning)
-- Users can insert avatars only for themselves
DROP POLICY IF EXISTS "Users can insert their own avatars" ON avatars;
CREATE POLICY "Users can insert their own avatars"
  ON avatars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for updating avatars
-- Users can only update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON avatars;
CREATE POLICY "Users can update their own avatars"
  ON avatars FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for deleting avatars
-- Users can only delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON avatars;
CREATE POLICY "Users can delete their own avatars"
  ON avatars FOR DELETE
  USING (auth.uid() = user_id);
