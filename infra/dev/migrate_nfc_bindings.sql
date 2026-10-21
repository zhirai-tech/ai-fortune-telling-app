CREATE TABLE IF NOT EXISTS public.nfc_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles (id) ON DELETE CASCADE,
  tag_uid text NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tag_uid)
);
CREATE INDEX IF NOT EXISTS nfc_bindings_user_created_idx ON public.nfc_bindings (user_id, created_at DESC);

ALTER TABLE public.nfc_bindings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.nfc_bindings ALTER COLUMN user_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS nfc_bindings_self_select ON public.nfc_bindings;
CREATE POLICY nfc_bindings_self_select
ON public.nfc_bindings
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS nfc_bindings_self_insert ON public.nfc_bindings;
CREATE POLICY nfc_bindings_self_insert
ON public.nfc_bindings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS nfc_bindings_self_delete ON public.nfc_bindings;
CREATE POLICY nfc_bindings_self_delete
ON public.nfc_bindings
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
