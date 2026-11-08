-- Small public images; includes backup/restore with the application database.
CREATE TABLE IF NOT EXISTS public.media_objects (
 bucket text NOT NULL,
 name text NOT NULL,
 body bytea NOT NULL CHECK (octet_length(body) BETWEEN 1 AND 2097152),
 content_type text NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(bucket,name)
);
ALTER TABLE public.media_objects ENABLE ROW LEVEL SECURITY;
