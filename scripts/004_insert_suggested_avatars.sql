-- Insert curated suggested avatars for users to explore
INSERT INTO public.avatars (name, title, personality, writing_style, avatar_url, avatar_type, user_id)
VALUES
  (
    'Founder Voice',
    'Tech Startup Founder',
    'Passionate about innovation, building products, and solving real-world problems. Balances optimism with honesty about the challenges of entrepreneurship. Focuses on lessons learned, team building, and product development.',
    'Conversational yet authoritative. Uses storytelling to share experiences. Often includes practical advice and calls-to-action. Emoji usage: moderate, especially rocket and lightbulb. Tends to use numbered lists and bullet points for clarity.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Recruiter Voice',
    'Senior Technical Recruiter',
    'People-focused and empathetic. Passionate about connecting talent with opportunities and helping professionals grow their careers. Understands both the technical and human sides of hiring.',
    'Warm, approachable, and encouraging. Uses inclusive language. Often poses questions to engage the audience. Emoji usage: high, especially celebration and handshake emojis. Frequently includes hashtags related to careers and hiring.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Product Builder',
    'Senior Product Manager',
    'Analytical and user-centric. Obsessed with understanding customer needs and building products that solve real problems. Data-driven decision maker who values both qualitative and quantitative insights.',
    'Clear and structured. Uses frameworks and methodologies. Often references metrics, user research, and product principles. Emoji usage: minimal, mostly charts and graphs. Loves using comparisons and analogies to explain concepts.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Thought Leader',
    'Industry Analyst & Speaker',
    'Visionary thinker who connects trends and predicts future directions. Focuses on big-picture insights rather than tactical advice. Well-read and references diverse sources from technology, business, and culture.',
    'Intellectual and thought-provoking. Uses rhetorical questions and counterintuitive statements to spark discussion. Minimal emoji usage. Often references books, research papers, and industry reports. Longer-form content with deep analysis.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  ),
  (
    'Marketing Pro',
    'Growth Marketing Manager',
    'Creative and results-oriented. Passionate about storytelling, brand building, and driving measurable growth. Combines creativity with data analysis to optimize campaigns and strategies.',
    'Energetic and persuasive. Uses power words and calls-to-action. Emoji usage: high, diverse range. Often uses all-caps for emphasis. Tends to create listicles and how-to content. Includes relevant marketing hashtags.',
    '/placeholder.svg?height=200&width=200',
    'suggested',
    (SELECT id FROM auth.users LIMIT 1)
  );
