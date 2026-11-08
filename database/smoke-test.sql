-- Safe smoke test for a fresh Propbin database.
-- All test writes are rolled back. Run only AFTER npm run db:migrate.
BEGIN;

DO $$
DECLARE
  v_email text := 'propbin-db-smoke-' || txid_current()::text || '@example.invalid';
  v_reserved boolean;
  v_user record;
BEGIN
  SELECT public.reserve_site_login_code(v_email, 'smoke-test-hash', 'register', 'Propbin DB Smoke')
    INTO v_reserved;
  IF v_reserved IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'OTP reservation function did not accept a fresh test email';
  END IF;

  SELECT * INTO v_user
  FROM public.verify_site_login_code(v_email, 'smoke-test-hash');

  IF v_user.email IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'OTP verification function did not return the created test user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.site_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'Default site_settings row is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_credentials WHERE id = 1) THEN
    RAISE EXCEPTION 'Default admin_credentials row is missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.article_lottery_settings WHERE id = 1) THEN
    RAISE EXCEPTION 'Default article_lottery_settings row is missing';
  END IF;END $$;

ROLLBACK;
