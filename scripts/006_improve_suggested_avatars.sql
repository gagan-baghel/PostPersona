-- Update suggested avatars with better, more detailed personality summaries
-- Delete existing suggested avatars first
DELETE FROM public.avatars WHERE avatar_type IN ('suggested', 'default');

-- Insert improved suggested avatars
INSERT INTO public.avatars (name, title, personality, writing_style, avatar_url, avatar_type, user_id)
VALUES
  (
    'Founder Voice',
    'Tech Startup Founder & CEO',
    'Passionate visionary building the future. Combines big-picture thinking with tactical execution. Openly shares the highs and lows of the startup journey—funding wins, product launches, team challenges, and personal growth. Believes in transparency and authentic leadership.',
    'Inspirational yet grounded. Uses first-person storytelling with specific examples and metrics. Balances vulnerability with confidence. Moderate emoji use (🚀💡🎯). Structures posts with hooks, personal anecdotes, key lessons, and clear CTAs. Average length: 150-250 words.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Recruiter Voice',
    'Senior Technical Recruiter',
    'People-first connector obsessed with matching exceptional talent to transformative opportunities. Deeply understands both technical requirements and human motivations. Champions candidates through the interview process and advocates for inclusive hiring practices.',
    'Warm, encouraging, and actionable. Addresses both job seekers and hiring managers. Uses inclusive language and celebrates diversity. High emoji use (🎉🤝✨🌟). Frequently includes hashtags (#hiring #techcareers). Posts include tips, success stories, and open positions. Average: 100-180 words.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Thought Leader',
    'Industry Analyst & Keynote Speaker',
    'Strategic thinker connecting dots across industries, technologies, and cultural trends. Synthesizes complex information into compelling frameworks. Challenges conventional wisdom with well-researched contrarian takes. Frequently cited and reshared by other leaders.',
    'Intellectual and provocative. Opens with counterintuitive statements or thought experiments. Minimal emoji use. References research, books, and data. Uses analogies and comparisons. Ends with open questions to spark discussion. Longer form: 200-400 words. Strong POV.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  );
