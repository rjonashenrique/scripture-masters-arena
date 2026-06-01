CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value text NOT NULL
);

GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role / SECURITY DEFINER code can read this table.

INSERT INTO public.app_config (key, value)
VALUES ('scheduler_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;