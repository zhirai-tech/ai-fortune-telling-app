DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_status') THEN
    CREATE TYPE public.relationship_status AS ENUM ('single', 'unmarried', 'dating', 'married');
  END IF;
END
$do$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS relationship_status public.relationship_status NOT NULL DEFAULT 'single';
