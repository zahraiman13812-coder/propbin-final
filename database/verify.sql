-- Run after npm run db:migrate. Returns missing objects as rows.
WITH required_tables(name) AS (VALUES
 ('media_objects'),('article_lottery_rounds'),('admin_login_limits'),('admin_credentials'),('site_settings'),('site_users'),('site_login_codes'),
 ('user_auth_attempts'),('prop_firms'),('firm_details'),('firm_discounts'),
 ('articles'),('article_image_references'),('site_polls'),('firm_questions'),
 ('firm_compare_rows'),('support_threads'),('support_messages'),
 ('article_lottery_settings'),('article_lottery_entries'),('article_lottery_winners'),
 ('article_lottery_submissions')
)
SELECT name AS missing_table
FROM required_tables
WHERE to_regclass('public.' || name) IS NULL;

-- These objects are intentionally excluded from the Propbin database.
SELECT name AS unwanted_wheel_table
FROM (VALUES ('wheel_settings'),('wheel_prizes'),('wheel_spins'),('wheel_draws')) AS t(name)
WHERE to_regclass('public.' || name) IS NOT NULL;

-- Any returned row is an issued request that is missing its canonical participant record.
SELECT s.id, s.user_id, s.period, s.issued_code
FROM public.article_lottery_submissions s
LEFT JOIN public.article_lottery_entries e
  ON e.user_id = s.user_id AND e.period = s.period
WHERE s.status = 'issued'
  AND (e.id IS NULL OR e.code <> s.issued_code);
