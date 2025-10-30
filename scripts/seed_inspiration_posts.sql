-- ============================================================================
-- SEED INSPIRATION POSTS
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
-- 50 posts curados de alta calidad para el Inspiration Hub
-- ============================================================================

INSERT INTO inspiration_posts (platform, author, title, content, summary, metrics, tags, source_url) VALUES
('linkedin', 'Simon Sinek', 'The Infinite Game', 'Leaders who play the infinite game don''t compete to win. They compete to keep playing. They build organizations that outlast them. They create cultures where people feel safe to take risks, to fail, and to learn. The goal isn''t to beat the competition. The goal is to outlast the competition.', 'Leadership requires long-term thinking and building lasting organizations', '{"likes": 15234, "comments": 892, "shares": 3401, "viralScore": 87}'::jsonb, ARRAY['leadership', 'business', 'strategy', 'culture'], 'https://linkedin.com/posts/example-1'),

('linkedin', 'Brené Brown', 'Vulnerability in Leadership', 'Vulnerability is not weakness. It''s our most accurate measure of courage. Leaders who show vulnerability create psychological safety. They admit mistakes, ask for help, and say ''I don''t know.'' This opens the door for innovation, collaboration, and trust.', 'Vulnerable leadership builds trust and enables innovation', '{"likes": 12890, "comments": 654, "shares": 2876, "viralScore": 84}'::jsonb, ARRAY['leadership', 'vulnerability', 'trust', 'culture'], 'https://linkedin.com/posts/example-2'),

('linkedin', 'Seth Godin', 'The Practice', 'Ship your work. Don''t wait for permission. Don''t wait for perfect. The practice is about showing up every day and doing the work. Professionals ship. Amateurs wait for inspiration. Your job is to create, to ship, to repeat. The world needs your contribution.', 'Consistent shipping and practice leads to mastery', '{"likes": 18234, "comments": 1023, "shares": 4521, "viralScore": 91}'::jsonb, ARRAY['creativity', 'productivity', 'entrepreneurship', 'mindset'], 'https://linkedin.com/posts/example-3'),

('linkedin', 'Adam Grant', 'Rethinking', 'Smart people don''t just think. They rethink. They question their assumptions. They actively seek out information that contradicts their beliefs. Intelligence is not about being right. It''s about being less wrong over time. Be a scientist of your own life.', 'Intellectual humility and rethinking lead to better decisions', '{"likes": 14567, "comments": 789, "shares": 3234, "viralScore": 86}'::jsonb, ARRAY['psychology', 'learning', 'growth', 'mindset'], 'https://linkedin.com/posts/example-4'),

('linkedin', 'Gary Vaynerchuk', 'Document, Don''t Create', 'Stop overthinking your content. Document your journey instead of creating fake perfection. People connect with authenticity, not production value. Your phone is enough. Your story is enough. Start now. The best time to plant a tree was 20 years ago. The second best time is today.', 'Authentic documentation beats polished creation', '{"likes": 21234, "comments": 1456, "shares": 5678, "viralScore": 93}'::jsonb, ARRAY['content', 'marketing', 'authenticity', 'socialmedia'], 'https://linkedin.com/posts/example-5'),

('linkedin', 'Reid Hoffman', 'Blitzscaling', 'Speed matters in startups. But speed without direction is just chaos. Blitzscaling is about rapidly scaling while accepting uncertainty and imperfection. You prioritize speed over efficiency when the cost of moving slowly is higher than the cost of making mistakes. Know when to blitzscale and when to optimize.', 'Strategic rapid scaling requires knowing when to prioritize speed', '{"likes": 9876, "comments": 543, "shares": 2345, "viralScore": 81}'::jsonb, ARRAY['startups', 'scaling', 'strategy', 'entrepreneurship'], 'https://linkedin.com/posts/example-6'),

('linkedin', 'Naval Ravikant', 'Specific Knowledge', 'Specific knowledge is knowledge that you cannot be trained for. It''s learned through apprenticeship or self-teaching, often highly technical or creative. It''s unique to you and your interests. Build specific knowledge. It''s how you become irreplaceable in a world of automation.', 'Unique, self-taught knowledge makes you irreplaceable', '{"likes": 16789, "comments": 892, "shares": 4123, "viralScore": 88}'::jsonb, ARRAY['career', 'learning', 'ai', 'future'], 'https://linkedin.com/posts/example-7'),

('linkedin', 'Sahil Bloom', 'Compound Growth', 'Small improvements compound. 1% better every day = 37x better in a year. This applies to everything: skills, relationships, health, wealth. Most people overestimate what they can do in a day and underestimate what they can do in a year. Focus on the daily 1%. Trust the process.', 'Daily incremental improvements lead to exponential growth', '{"likes": 13456, "comments": 678, "shares": 3456, "viralScore": 85}'::jsonb, ARRAY['growth', 'habits', 'productivity', 'mindset'], 'https://linkedin.com/posts/example-8'),

('linkedin', 'Patrick Bet-David', 'Resourcefulness', 'It''s not about resources. It''s about resourcefulness. The biggest companies started in garages. The best products started with constraints. Lack of money, time, or connections is an excuse. The question is: are you resourceful enough? Your limitations force creativity.', 'Resourcefulness matters more than resources', '{"likes": 11234, "comments": 567, "shares": 2789, "viralScore": 82}'::jsonb, ARRAY['entrepreneurship', 'mindset', 'business', 'motivation'], 'https://linkedin.com/posts/example-9'),

('linkedin', 'Tim Ferriss', 'Fear Setting', 'We don''t fear failure. We fear the unknown. Try fear-setting instead of goal-setting. Define your fears in detail. What''s the worst that could happen? What could you do to prevent it? What could you do to repair it? Most fears evaporate under scrutiny. Take the leap.', 'Analyzing fears in detail reveals they''re often manageable', '{"likes": 14890, "comments": 734, "shares": 3678, "viralScore": 87}'::jsonb, ARRAY['mindset', 'fear', 'risk', 'growth'], 'https://linkedin.com/posts/example-10'),

('linkedin', 'Alex Hormozi', 'Value Equation', 'Value = (Dream Outcome × Perceived Likelihood) / (Time Delay × Effort & Sacrifice). To increase value: Make the outcome more desirable. Make success more certain. Make it faster. Make it easier. This is how you build $100M offers. Focus on these 4 variables.', 'The value equation explains how to create irresistible offers', '{"likes": 17890, "comments": 945, "shares": 4567, "viralScore": 90}'::jsonb, ARRAY['sales', 'marketing', 'value', 'business'], 'https://linkedin.com/posts/example-11'),

('linkedin', 'Lenny Rachitsky', 'Product-Market Fit', 'You know you have product-market fit when you can''t keep up with demand. When customers are telling their friends without you asking. When you''re struggling to support all the users signing up. Until then, nothing else matters. Talk to users. Iterate fast. Find the fit.', 'Product-market fit is unmistakable when you achieve it', '{"likes": 10234, "comments": 512, "shares": 2456, "viralScore": 83}'::jsonb, ARRAY['product', 'startups', 'pmf', 'growth'], 'https://linkedin.com/posts/example-12'),

('linkedin', 'Amy Porterfield', 'Email List First', 'Your email list is your most valuable asset. Social media platforms can disappear overnight. Algorithms change. But your email list is yours forever. Build it from day one. Serve your list. They''re your warmest audience. Email isn''t dead. It''s more powerful than ever.', 'Email lists provide ownership and control over your audience', '{"likes": 8765, "comments": 432, "shares": 1987, "viralScore": 79}'::jsonb, ARRAY['marketing', 'email', 'audience', 'business'], 'https://linkedin.com/posts/example-13'),

('linkedin', 'Daniel Pink', 'Drive and Motivation', 'Money is a terrible long-term motivator. What drives us: Autonomy - the desire to direct our lives. Mastery - the urge to get better. Purpose - the yearning to do something meaningful. Build these into your work. Build these into your team. That''s how you win.', 'Intrinsic motivation comes from autonomy, mastery, and purpose', '{"likes": 12345, "comments": 623, "shares": 2987, "viralScore": 84}'::jsonb, ARRAY['motivation', 'leadership', 'management', 'culture'], 'https://linkedin.com/posts/example-14'),

('linkedin', 'James Clear', 'Atomic Habits', 'You don''t rise to the level of your goals. You fall to the level of your systems. Habits are the compound interest of self-improvement. Focus on: Cue (make it obvious), Craving (make it attractive), Response (make it easy), Reward (make it satisfying). Small changes, remarkable results.', 'Systems and habits matter more than goals', '{"likes": 19876, "comments": 1123, "shares": 5234, "viralScore": 92}'::jsonb, ARRAY['habits', 'productivity', 'growth', 'systems'], 'https://linkedin.com/posts/example-15');

-- Verificar inserción
SELECT COUNT(*) as total_posts FROM inspiration_posts;
SELECT platform, COUNT(*) as count FROM inspiration_posts GROUP BY platform;
SELECT author, title, (metrics->>'viralScore')::int as viral_score
FROM inspiration_posts
ORDER BY (metrics->>'viralScore')::int DESC
LIMIT 10;

-- ============================================================================
-- NOTA: Este script inserta solo 15 de los 50 posts para mantener el tamaño manejable
-- Para insertar los 50 posts completos, ejecuta: npx ts-node scripts/seed_via_api.ts
-- ============================================================================
