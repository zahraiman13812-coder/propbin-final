-- Production hotfix: resolve PL/pgSQL ambiguous email references (SQLSTATE 42702).
-- Only function definitions are replaced. NO account, OTP, session, or other data is deleted.
-- This follows the existing signature so active application RPC calls keep working.

CREATE OR REPLACE FUNCTION public.reserve_site_login_code(
  p_email text, p_hash text, p_mode text, p_name text
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  c public.site_login_codes%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_email, 0));
  SELECT lc.* INTO c
  FROM public.site_login_codes AS lc
  WHERE lc.email = p_email
  FOR UPDATE;

  IF FOUND AND c.created_at > now() - interval '60 seconds' THEN RETURN false; END IF;
  IF FOUND AND c.window_start > now() - interval '1 hour' AND c.requests_in_window >= 5 THEN RETURN false; END IF;

  INSERT INTO public.site_login_codes
    (email, hash, mode, name, expires_at, created_at, attempts, window_start, requests_in_window)
  VALUES
    (p_email, p_hash, p_mode, p_name, now() + interval '10 minutes', now(), 0, now(), 1)
  ON CONFLICT ON CONSTRAINT site_login_codes_pkey DO UPDATE SET
    hash = EXCLUDED.hash,
    mode = EXCLUDED.mode,
    name = EXCLUDED.name,
    expires_at = EXCLUDED.expires_at,
    created_at = now(),
    attempts = 0,
    window_start = CASE
      WHEN site_login_codes.window_start > now() - interval '1 hour'
        THEN site_login_codes.window_start ELSE now() END,
    requests_in_window = CASE
      WHEN site_login_codes.window_start > now() - interval '1 hour'
        THEN site_login_codes.requests_in_window + 1 ELSE 1 END;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.verify_site_login_code(p_email text, p_hash text)
RETURNS TABLE(id uuid, email text, name text, created_at timestamptz)
LANGUAGE plpgsql AS $$
DECLARE
  c public.site_login_codes%ROWTYPE;
BEGIN
  SELECT lc.* INTO c
  FROM public.site_login_codes AS lc
  WHERE lc.email = p_email
  FOR UPDATE;

  IF NOT FOUND OR c.expires_at < now() OR c.attempts >= 5 THEN RETURN; END IF;

  IF c.hash <> p_hash THEN
    UPDATE public.site_login_codes AS lc
    SET attempts = lc.attempts + 1
    WHERE lc.email = p_email;
    RETURN;
  END IF;

  UPDATE public.site_login_codes AS lc
  SET hash = 'used:' || encode(gen_random_bytes(32),'hex'),
      expires_at = now() - interval '1 second',
      attempts = 5
  WHERE lc.email = p_email;

  IF c.mode = 'register' THEN
    INSERT INTO public.site_users AS su (email,name)
    VALUES (p_email, COALESCE(NULLIF(c.name,''), 'کاربر پراپ‌بین'))
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
    SELECT su.id, su.email, su.name, su.created_at
    FROM public.site_users AS su
    WHERE su.email = p_email;
END $$;
