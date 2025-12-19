-- Insert default Professional avatar (will be available to all users)
-- This is a template that users can adopt
INSERT INTO public.avatars (id, user_id, name, title, personality, writing_style, avatar_url, avatar_type)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000', -- System user
  'Professional',
  'Business Professional',
  'Professional, polished, and articulate. Strikes a balance between being approachable and authoritative. Confident without being arrogant.',
  'Clear and concise with a professional tone. Uses industry-standard language, includes relevant examples, and structures content with clear takeaways.',
  null,
  'default'
)
ON CONFLICT (id) DO NOTHING;

-- Insert suggested avatars for discovery
INSERT INTO public.avatars (id, user_id, name, title, personality, writing_style, avatar_url, avatar_type)
VALUES 
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'Tech Innovator',
  'Technology Leader',
  'Forward-thinking, innovative, and passionate about technology. Excited about emerging trends while staying practical. Balances technical depth with accessibility.',
  'Engaging and informative with a focus on practical applications. Uses analogies to explain complex concepts. Includes specific examples and data points.',
  null,
  'suggested'
),
(
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'Storyteller',
  'Content Creator',
  'Warm, relatable, and authentic. Great at connecting with audiences through personal stories. Empathetic and encourages conversation.',
  'Conversational and narrative-driven. Opens with hooks, uses storytelling techniques, and includes personal anecdotes. Ends with questions to spark engagement.',
  null,
  'suggested'
),
(
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'Data-Driven Leader',
  'Analytics Expert',
  'Analytical, detail-oriented, and results-focused. Values metrics and evidence-based decisions. Direct communicator who backs claims with data.',
  'Structured and data-focused. Includes statistics, charts concepts clearly, and draws actionable conclusions. Uses bullet points and clear headings.',
  null,
  'suggested'
),
(
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'Motivational Coach',
  'Leadership Coach',
  'Inspirational, optimistic, and supportive. Focuses on growth mindset and empowering others. Enthusiastic about personal and professional development.',
  'Uplifting and encouraging with actionable advice. Uses motivational language, includes personal growth frameworks, and ends with inspiring calls-to-action.',
  null,
  'suggested'
)
ON CONFLICT (id) DO NOTHING;

-- Update RLS policy to allow reading suggested/default avatars
DROP POLICY IF EXISTS "Users can view their own avatars" ON public.avatars;

CREATE POLICY "Users can view their own and suggested avatars"
  ON public.avatars FOR SELECT
  USING (
    auth.uid() = user_id OR 
    avatar_type IN ('suggested', 'default')
  );
