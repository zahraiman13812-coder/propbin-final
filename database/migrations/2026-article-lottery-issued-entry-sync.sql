-- Backfill previously issued article-lottery codes into the canonical participants table.
-- This repairs historical submissions created before the admin issue flow synchronized both tables.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.article_lottery_submissions s
    JOIN public.article_lottery_entries e
      ON e.code = s.issued_code
    WHERE s.status = 'issued'
      AND s.issued_code IS NOT NULL
      AND (e.user_id <> s.user_id OR e.period <> s.period)
  ) THEN
    RAISE EXCEPTION
      'Cannot sync issued article-lottery submissions: at least one issued code is already assigned to a different participant/period.';
  END IF;
END
$$;

INSERT INTO public.article_lottery_entries
  (user_id, name, email, code, period, created_at)
SELECT
  s.user_id,
  COALESCE(NULLIF(BTRIM(s.name), ''), NULLIF(SPLIT_PART(s.email, '@', 1), ''), 'کاربر پراپ‌بین'),
  s.email,
  s.issued_code,
  s.period,
  COALESCE(s.created_at, now())
FROM public.article_lottery_submissions s
WHERE s.status = 'issued'
  AND s.issued_code IS NOT NULL
  AND LENGTH(BTRIM(s.issued_code)) BETWEEN 4 AND 60
ON CONFLICT (user_id, period)
DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  code = EXCLUDED.code;
