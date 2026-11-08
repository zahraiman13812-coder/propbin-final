-- Run on the production PostgreSQL database BEFORE deploying the updated files.
-- This preserves all existing discount/code values and other company data.
ALTER TABLE public.prop_firms ADD COLUMN IF NOT EXISTS purchase_method TEXT NOT NULL DEFAULT '';
