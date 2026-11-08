-- No permanent changes: call the OTP routines within a transaction and roll back.
-- Invoke: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/test-otp-hotfix.sql
BEGIN;
DO $$
DECLARE
  test_email text := 'propbin-otp-hotfix-' || txid_current()::text || '@example.invalid';
  test_hash text := encode(gen_random_bytes(32), 'hex');
  reserved boolean;
  verified record;
BEGIN
  SELECT public.reserve_site_login_code(test_email, test_hash, 'register', 'OTP Hotfix Test') INTO reserved;
  IF reserved IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'OTP reservation failed';
  END IF;
  SELECT * INTO verified FROM public.verify_site_login_code(test_email, test_hash);
  IF verified.email IS DISTINCT FROM test_email THEN
    RAISE EXCEPTION 'OTP verification failed';
  END IF;
  RAISE NOTICE 'PASS: reserve and verify OTP returned expected user';
END $$;
ROLLBACK;
