CREATE TABLE public.ai_generation_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  source_text text NOT NULL,
  question_count integer NOT NULL DEFAULT 0,
  difficulty text,
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_generation_logs TO authenticated;
GRANT ALL ON public.ai_generation_logs TO service_role;

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view AI generation logs"
ON public.ai_generation_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));