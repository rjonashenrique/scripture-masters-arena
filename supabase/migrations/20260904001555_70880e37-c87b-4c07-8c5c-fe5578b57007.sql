-- 1. Restrict championships / championship_scores reads to signed-in users
DROP POLICY IF EXISTS "Anyone can view championships" ON public.championships;
CREATE POLICY "Signed-in users can view championships"
  ON public.championships FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.championships FROM anon;

DROP POLICY IF EXISTS "Anyone can view scores" ON public.championship_scores;
CREATE POLICY "Signed-in users can view scores"
  ON public.championship_scores FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.championship_scores FROM anon;

-- 2. Anti-spam for weekly challenge contributions
CREATE TABLE IF NOT EXISTS public.challenge_contribution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL,
  user_id uuid NOT NULL,
  challenge_type text NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS challenge_contribution_log_user_idx
  ON public.challenge_contribution_log (user_id, created_at DESC);

GRANT SELECT ON public.challenge_contribution_log TO authenticated;
GRANT ALL ON public.challenge_contribution_log TO service_role;
ALTER TABLE public.challenge_contribution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own contribution log"
  ON public.challenge_contribution_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Remove direct table writes so progress can only change through the guarded function
DROP POLICY IF EXISTS "Members can update progress" ON public.church_challenge_progress;
DROP POLICY IF EXISTS "Members can insert progress" ON public.church_challenge_progress;
REVOKE INSERT, UPDATE, DELETE ON public.church_challenge_progress FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.contribute_challenge_progress(
  p_church_id uuid, p_challenge_type text, p_amount integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_last timestamptz;
  v_today integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF p_challenge_type IS NULL OR p_challenge_type NOT IN
     ('questions', 'correct_answers', 'battles', 'points', 'streak', 'lessons') THEN
    RAISE EXCEPTION 'Invalid challenge type';
  END IF;

  -- Clamp to a plausible per-round contribution
  p_amount := LEAST(GREATEST(COALESCE(p_amount, 0), 1), 20);

  IF NOT EXISTS (
    SELECT 1 FROM public.church_members
    WHERE church_id = p_church_id AND user_id = v_user
  ) THEN
    RAISE EXCEPTION 'Not a member of this church';
  END IF;

  -- Rate limit: minimum 10 seconds between contributions
  SELECT MAX(created_at) INTO v_last
  FROM public.challenge_contribution_log WHERE user_id = v_user;
  IF v_last IS NOT NULL AND v_last > now() - interval '10 seconds' THEN
    RETURN;
  END IF;

  -- Daily cap per player
  SELECT COALESCE(SUM(amount), 0) INTO v_today
  FROM public.challenge_contribution_log
  WHERE user_id = v_user AND created_at >= date_trunc('day', now());

  IF v_today >= 200 THEN RETURN; END IF;
  p_amount := LEAST(p_amount, 200 - v_today);

  INSERT INTO public.challenge_contribution_log (church_id, user_id, challenge_type, amount)
  VALUES (p_church_id, v_user, p_challenge_type, p_amount);

  UPDATE public.church_challenge_progress cp
  SET
    current_value = LEAST(cp.current_value + p_amount, wc.target_value),
    completed = (cp.current_value + p_amount >= wc.target_value),
    completed_at = CASE WHEN cp.current_value + p_amount >= wc.target_value AND cp.completed = false
                        THEN now() ELSE cp.completed_at END
  FROM public.weekly_challenges wc
  WHERE cp.challenge_id = wc.id
    AND cp.church_id = p_church_id
    AND wc.challenge_type = p_challenge_type
    AND wc.week_start <= CURRENT_DATE
    AND wc.week_end >= CURRENT_DATE
    AND cp.completed = false;
END;
$function$;