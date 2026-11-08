-- Additive migration. Run with npm run db:migrate before deploying the new login route.
CREATE TABLE IF NOT EXISTS public.admin_login_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts >= 1)
);
CREATE INDEX IF NOT EXISTS idx_firm_questions_user_firm
  ON public.firm_questions(user_id, firm_id);
CREATE INDEX IF NOT EXISTS idx_article_image_references_path
  ON public.article_image_references(storage_path);
CREATE INDEX IF NOT EXISTS idx_lottery_winners_entry
  ON public.article_lottery_winners(entry_id);
