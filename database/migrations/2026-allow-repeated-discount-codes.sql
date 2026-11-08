-- Allow a firm to have multiple offers with the same coupon code.
-- Existing discounts and their IDs are preserved.
ALTER TABLE public.firm_discounts
  DROP CONSTRAINT IF EXISTS firm_discounts_firm_id_code_key;

-- Remove any other unique constraints enforcing exactly (firm_id, code)
-- only if custom names were used (inspect before manual removal).
-- The primary key (id) remains unique.
