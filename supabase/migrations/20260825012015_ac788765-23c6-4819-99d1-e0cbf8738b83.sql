-- Level/league helpers
CREATE OR REPLACE FUNCTION public.clan_level_from_xp(p_xp integer)
RETURNS integer LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE lvl integer := 1; remaining integer := GREATEST(COALESCE(p_xp,0),0); need integer := 100;
BEGIN
  WHILE remaining >= need AND lvl < 100 LOOP
    remaining := remaining - need;
    lvl := lvl + 1;
    need := 100 * lvl;
  END LOOP;
  RETURN lvl;
END; $$;

CREATE OR REPLACE FUNCTION public.clan_league_from_xp(p_xp integer)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(p_xp,0) >= 100000 THEN 'legend'
    WHEN COALESCE(p_xp,0) >= 50000 THEN 'master'
    WHEN COALESCE(p_xp,0) >= 20000 THEN 'diamond'
    WHEN COALESCE(p_xp,0) >= 8000 THEN 'gold'
    WHEN COALESCE(p_xp,0) >= 2000 THEN 'silver'
    ELSE 'bronze' END;
$$;

-- Audit log
CREATE TABLE public.clan_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL CHECK (xp > 0 AND xp <= 100),
  source text NOT NULL DEFAULT 'quiz',
  correct_answers integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clan_xp_log_user_day ON public.clan_xp_log (user_id, created_at DESC);
CREATE INDEX idx_clan_xp_log_clan ON public.clan_xp_log (clan_id, created_at DESC);

GRANT SELECT ON public.clan_xp_log TO authenticated;
GRANT ALL ON public.clan_xp_log TO service_role;

ALTER TABLE public.clan_xp_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clan members read own clan xp log"
ON public.clan_xp_log FOR SELECT TO authenticated
USING (clan_id = public.my_clan_id());

-- Secure XP grant
CREATE OR REPLACE FUNCTION public.award_clan_xp(
  p_correct integer,
  p_total integer,
  p_source text DEFAULT 'quiz'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_clan uuid;
  v_xp integer;
  v_today integer;
  v_last timestamptz;
  v_new_xp integer;
  v_level integer;
  v_league text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF p_source NOT IN ('quiz', 'challenge', 'battle', 'battle_royale') THEN
    RAISE EXCEPTION 'Origem inválida';
  END IF;

  SELECT clan_id INTO v_clan FROM public.clan_members WHERE user_id = v_user;
  IF v_clan IS NULL THEN
    RETURN jsonb_build_object('granted', 0, 'reason', 'sem_cla');
  END IF;

  -- Sanitize inputs: no more than 20 questions per round, correct <= total
  p_total := LEAST(GREATEST(COALESCE(p_total, 0), 0), 20);
  p_correct := LEAST(GREATEST(COALESCE(p_correct, 0), 0), p_total);

  -- 5 XP per correct answer, hard cap 100 per round
  v_xp := LEAST(p_correct * 5, 100);
  IF v_xp <= 0 THEN
    RETURN jsonb_build_object('granted', 0, 'reason', 'sem_acertos');
  END IF;

  -- Rate limit: minimum 10 seconds between grants
  SELECT MAX(created_at) INTO v_last FROM public.clan_xp_log WHERE user_id = v_user;
  IF v_last IS NOT NULL AND v_last > now() - interval '10 seconds' THEN
    RETURN jsonb_build_object('granted', 0, 'reason', 'muito_rapido');
  END IF;

  -- Daily cap per player: 600 XP
  SELECT COALESCE(SUM(xp), 0) INTO v_today
  FROM public.clan_xp_log
  WHERE user_id = v_user AND created_at >= date_trunc('day', now());

  IF v_today >= 600 THEN
    RETURN jsonb_build_object('granted', 0, 'reason', 'limite_diario');
  END IF;

  v_xp := LEAST(v_xp, 600 - v_today);

  INSERT INTO public.clan_xp_log (clan_id, user_id, xp, source, correct_answers)
  VALUES (v_clan, v_user, v_xp, p_source, p_correct);

  UPDATE public.clan_members
  SET xp_contributed = xp_contributed + v_xp
  WHERE user_id = v_user AND clan_id = v_clan;

  UPDATE public.clans
  SET xp = xp + v_xp,
      level = public.clan_level_from_xp(xp + v_xp),
      league = public.clan_league_from_xp(xp + v_xp),
      updated_at = now()
  WHERE id = v_clan
  RETURNING xp, level, league INTO v_new_xp, v_level, v_league;

  RETURN jsonb_build_object(
    'granted', v_xp,
    'clan_xp', v_new_xp,
    'level', v_level,
    'league', v_league,
    'daily_remaining', GREATEST(600 - (v_today + v_xp), 0)
  );
END; $$;

REVOKE ALL ON FUNCTION public.award_clan_xp(integer, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.award_clan_xp(integer, integer, text) TO authenticated;

-- Block client-side tampering of clan xp/level/league
CREATE OR REPLACE FUNCTION public.protect_clan_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.league IS DISTINCT FROM OLD.league
     OR NEW.member_count IS DISTINCT FROM OLD.member_count THEN
    IF current_setting('role', true) <> 'service_role' AND auth.uid() IS NOT NULL THEN
      NEW.xp := OLD.xp;
      NEW.level := OLD.level;
      NEW.league := OLD.league;
      NEW.member_count := OLD.member_count;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_clan_progress ON public.clans;
CREATE TRIGGER trg_protect_clan_progress
BEFORE UPDATE ON public.clans
FOR EACH ROW EXECUTE FUNCTION public.protect_clan_progress();