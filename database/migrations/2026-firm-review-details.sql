CREATE TABLE IF NOT EXISTS public.firm_details (
    firm_id UUID PRIMARY KEY
        REFERENCES public.prop_firms(id)
        ON DELETE CASCADE,

    content JSONB NOT NULL DEFAULT '{}'::jsonb,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);