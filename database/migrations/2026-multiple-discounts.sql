-- Execute on the existing PostgreSQL database after taking a backup.
ALTER TABLE prop_firms ADD COLUMN IF NOT EXISTS discount_intro text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS firm_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES prop_firms(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (char_length(code) BETWEEN 1 AND 100),
  amount text NOT NULL CHECK (char_length(amount) BETWEEN 1 AND 100),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id,code)
);
CREATE INDEX IF NOT EXISTS idx_firm_discounts_firm ON firm_discounts(firm_id,sort_order,created_at);
-- Preserve legacy single coupon as a separate record; safe on reruns.
INSERT INTO firm_discounts(firm_id,code,amount)
SELECT id, trim(code), trim(discount) FROM prop_firms
WHERE nullif(trim(coalesce(code,'')),'') IS NOT NULL AND nullif(trim(coalesce(discount,'')),'') IS NOT NULL
ON CONFLICT(firm_id,code) DO NOTHING;
