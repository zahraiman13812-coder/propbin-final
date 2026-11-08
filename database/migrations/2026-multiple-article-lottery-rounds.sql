-- Independent concurrent lottery rounds; preserve the legacy settings and all history.
CREATE TABLE IF NOT EXISTS public.article_lottery_rounds (
  period text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  article_slug text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT article_lottery_rounds_period_nonempty CHECK (length(trim(period)) > 0)
);
INSERT INTO public.article_lottery_rounds (period, enabled, title, description, article_slug)
SELECT period, COALESCE(enabled, false), COALESCE(title, ''), COALESCE(description, ''), COALESCE(article_slug, '')
FROM public.article_lottery_settings WHERE id = 1 AND length(trim(period)) > 0
ON CONFLICT (period) DO NOTHING;
-- Preserve periods that already have participation history.
INSERT INTO public.article_lottery_rounds (period, enabled, title)
SELECT period, false, period FROM (
 SELECT period FROM public.article_lottery_entries
 UNION SELECT period FROM public.article_lottery_submissions
 UNION SELECT period FROM public.article_lottery_winners
) previous WHERE length(trim(period)) > 0
ON CONFLICT (period) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_article_lottery_rounds_enabled ON public.article_lottery_rounds(enabled);
