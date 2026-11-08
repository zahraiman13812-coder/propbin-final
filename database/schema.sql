CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS admin_credentials (id integer PRIMARY KEY DEFAULT 1, password_hash text, session_version integer NOT NULL DEFAULT 1, updated_at timestamptz DEFAULT now());
INSERT INTO admin_credentials(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS site_settings (id integer PRIMARY KEY DEFAULT 1, site_name text DEFAULT 'پراپ بین',site_description text DEFAULT '',settings jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz DEFAULT now());
INSERT INTO site_settings(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS site_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text NOT NULL UNIQUE,name text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS site_login_codes (email text PRIMARY KEY, hash text NOT NULL, mode text NOT NULL, name text, expires_at timestamptz NOT NULL, created_at timestamptz DEFAULT now(), attempts integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS prop_firms (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL, rating numeric NOT NULL DEFAULT 0, capital text DEFAULT '', profit text DEFAULT '', fee text DEFAULT '', discount text DEFAULT '', code text DEFAULT '', color text DEFAULT '', description text DEFAULT '', payout text DEFAULT '', challenge text DEFAULT '', logo_text text DEFAULT '',logo text DEFAULT '',website text DEFAULT '',is_active boolean DEFAULT true,sort_order integer DEFAULT 0, created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS articles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,slug text NOT NULL UNIQUE,excerpt text DEFAULT '',body text DEFAULT '',image text,category text DEFAULT 'عمومی',author text DEFAULT '',seo_title text,seo_description text,keywords text,canonical_url text,status text NOT NULL DEFAULT 'draft',published_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS article_image_references(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), article_id uuid REFERENCES articles(id) ON DELETE CASCADE,storage_path text NOT NULL,created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS site_polls(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),firm_id text NOT NULL,user_id text NOT NULL,trust integer NOT NULL CHECK (trust BETWEEN 1 AND 5),support integer NOT NULL CHECK (support BETWEEN 1 AND 5),payout integer NOT NULL CHECK (payout BETWEEN 1 AND 5),rules integer NOT NULL CHECK (rules BETWEEN 1 AND 5),comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 500),approved boolean NOT NULL DEFAULT false,featured boolean NOT NULL DEFAULT false,display_name text DEFAULT '',created_at timestamptz DEFAULT now(),UNIQUE(firm_id,user_id));
CREATE TABLE IF NOT EXISTS support_threads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL UNIQUE,name text DEFAULT '',email text DEFAULT '',status text DEFAULT 'open',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS support_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,role text NOT NULL,text text NOT NULL,created_at timestamptz DEFAULT now(),read_by_user boolean DEFAULT false,read_by_admin boolean DEFAULT false);
CREATE TABLE IF NOT EXISTS article_lottery_settings (id integer PRIMARY KEY DEFAULT 1,enabled boolean DEFAULT false,title text DEFAULT '',description text DEFAULT '',article_slug text DEFAULT '',period text DEFAULT '',updated_at timestamptz DEFAULT now());
INSERT INTO article_lottery_settings(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS article_lottery_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id text NOT NULL,name text DEFAULT '',email text DEFAULT '',code text NOT NULL UNIQUE,period text NOT NULL,created_at timestamptz DEFAULT now(),UNIQUE(user_id,period));
CREATE TABLE IF NOT EXISTS article_lottery_winners(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),period text NOT NULL UNIQUE,entry_id uuid REFERENCES article_lottery_entries(id),selected_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status,published_at DESC);
CREATE INDEX IF NOT EXISTS idx_firms_sort ON prop_firms(is_active,sort_order);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON support_messages(thread_id,created_at);
CREATE INDEX IF NOT EXISTS idx_polls_firm ON site_polls(firm_id,approved);

CREATE OR REPLACE FUNCTION reserve_site_login_code(p_email text,p_hash text,p_mode text,p_name text)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM site_login_codes WHERE email=p_email AND created_at>now()-interval '60 seconds') THEN RETURN false; END IF;
  INSERT INTO site_login_codes(email,hash,mode,name,expires_at,created_at,attempts)
  VALUES (p_email,p_hash,p_mode,p_name,now()+interval '10 minutes',now(),0)
  ON CONFLICT(email) DO UPDATE SET hash=excluded.hash,mode=excluded.mode,name=excluded.name,expires_at=excluded.expires_at,created_at=now(),attempts=0;
  RETURN true;
END $$;
CREATE OR REPLACE FUNCTION verify_site_login_code(p_email text,p_hash text)
RETURNS TABLE(id uuid,email text,name text,created_at timestamptz) LANGUAGE plpgsql AS $$
DECLARE c site_login_codes%ROWTYPE;
BEGIN
  SELECT * INTO c FROM site_login_codes WHERE site_login_codes.email=p_email FOR UPDATE;
  IF NOT FOUND OR c.expires_at<now() OR c.attempts>=5 THEN RETURN; END IF;
  IF c.hash<>p_hash THEN UPDATE site_login_codes SET attempts=attempts+1 WHERE site_login_codes.email=p_email; RETURN; END IF;
  DELETE FROM site_login_codes WHERE site_login_codes.email=p_email;
  INSERT INTO site_users(email,name) VALUES (p_email,COALESCE(c.name,'کاربر')) ON CONFLICT(email) DO NOTHING;
  RETURN QUERY SELECT u.id,u.email,u.name,u.created_at FROM site_users u WHERE u.email=p_email;
END $$;

-- Run once against the same PostgreSQL database configured in DATABASE_URL.
CREATE TABLE IF NOT EXISTS firm_questions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), firm_id uuid NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
 user_id text NOT NULL, display_name text NOT NULL DEFAULT '', question text NOT NULL,
 approved boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT firm_question_length CHECK (char_length(question) BETWEEN 5 AND 1500)
);
CREATE INDEX IF NOT EXISTS idx_firm_questions_moderation ON firm_questions(approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_firm_questions_firm ON firm_questions(firm_id, approved, created_at DESC);
CREATE TABLE IF NOT EXISTS firm_compare_rows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL UNIQUE,
 row_key text UNIQUE, position integer NOT NULL DEFAULT 0, is_visible boolean NOT NULL DEFAULT true,
 values_json jsonb NOT NULL DEFAULT '{}'::jsonb,
 CONSTRAINT firm_compare_label_length CHECK (char_length(label) BETWEEN 1 AND 80)
);
CREATE INDEX IF NOT EXISTS idx_firm_compare_rows_order ON firm_compare_rows(position,id);
