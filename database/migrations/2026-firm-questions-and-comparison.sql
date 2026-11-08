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
