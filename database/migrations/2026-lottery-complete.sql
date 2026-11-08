-- PRA-P BIN | Complete non-destructive lottery database installation
-- IMPORTANT: execute this on the SAME database/branch as Production DATABASE_URL on Vercel.
-- This script does not remove existing users or lottery history.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.article_lottery_settings (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean DEFAULT false,
  title text DEFAULT '',
  description text DEFAULT '',
  article_slug text DEFAULT '',
  period text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.article_lottery_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text DEFAULT '',
  email text DEFAULT '',
  code text NOT NULL UNIQUE,
  period text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period)
);
CREATE TABLE IF NOT EXISTS public.article_lottery_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL UNIQUE,
  entry_id uuid REFERENCES public.article_lottery_entries(id),
  selected_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.article_lottery_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  period text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','issued')),
  issued_code text,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(user_id, period)
);
CREATE INDEX IF NOT EXISTS idx_article_lottery_submissions_period ON public.article_lottery_submissions(period);
CREATE INDEX IF NOT EXISTS idx_article_lottery_submissions_status ON public.article_lottery_submissions(status);
CREATE INDEX IF NOT EXISTS idx_article_lottery_submissions_user ON public.article_lottery_submissions(user_id);
COMMIT;
SELECT current_database() AS database_name,
       current_setting('search_path') AS search_path,
       to_regclass('public.article_lottery_submissions') AS submission_table,
       to_regclass('public.article_lottery_entries') AS entries_table,
       to_regclass('public.article_lottery_settings') AS settings_table;
