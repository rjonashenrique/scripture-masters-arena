ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level_reached_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.player_xp_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  xp integer NOT NULL,
  correct_answers integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.player_xp_log TO authenticated;
GRANT ALL ON public.player_xp_log TO service_role;
ALTER TABLE public.player_xp_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own xp log or staff" ON public.player_xp_log FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE INDEX IF NOT EXISTS player_xp_log_user_time ON public.player_xp_log(user_id, created_at DESC);

-- XP needed to go from level n to n+1
CREATE OR REPLACE FUNCTION public.xp_for_next_level(p_level integer) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 100 + 50 * (p_level - 1) + 2 * (p_level - 1) * (p_level - 1)
$$;

CREATE OR REPLACE FUNCTION public.player_level_name(p_level integer) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_level >= 100 THEN 'Guardião da Palavra'
    WHEN p_level >= 75 THEN 'Mestre Bíblico'
    WHEN p_level >= 60 THEN 'Conhecedor da Palavra'
    WHEN p_level >= 50 THEN 'Missionário'
    WHEN p_level >= 40 THEN 'Mensageiro'
    WHEN p_level >= 30 THEN 'Servo'
    WHEN p_level >= 20 THEN 'Estudioso'
    WHEN p_level >= 10 THEN 'Discípulo'
    WHEN p_level >= 5 THEN 'Aprendiz'
    ELSE 'Iniciante' END
$$;

-- Single source of truth for level math
CREATE OR REPLACE FUNCTION public.player_level_info(p_xp integer) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE v_level integer := 1; v_rest integer := GREATEST(COALESCE(p_xp,0),0); v_need integer;
BEGIN
  LOOP
    EXIT WHEN v_level >= 100;
    v_need := public.xp_for_next_level(v_level);
    EXIT WHEN v_rest < v_need;
    v_rest := v_rest - v_need;
    v_level := v_level + 1;
  END LOOP;
  IF v_level >= 100 THEN
    RETURN jsonb_build_object('level',100,'name',public.player_level_name(100),'total_xp',p_xp,
      'level_xp',0,'next_level_xp',0,'remaining_xp',0,'progress',100,'next_name',null);
  END IF;
  v_need := public.xp_for_next_level(v_level);
  RETURN jsonb_build_object('level',v_level,'name',public.player_level_name(v_level),'total_xp',p_xp,
    'level_xp',v_rest,'next_level_xp',v_need,'remaining_xp',v_need - v_rest,
    'progress',floor(v_rest * 100.0 / v_need),'next_name',public.player_level_name(v_level+1));
END $$;

CREATE OR REPLACE FUNCTION public.level_title(p_level integer) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_level WHEN 1 THEN '🌱 Iniciante' WHEN 10 THEN '📖 Discípulo'
    WHEN 25 THEN '🔥 Estudioso da Palavra' WHEN 50 THEN '⚔️ Guerreiro da Palavra'
    WHEN 75 THEN '🏆 Mestre Bíblico' WHEN 100 THEN '👑 Guardião da Palavra' ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.level_milestone_coins(p_level integer) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_level WHEN 5 THEN 50 WHEN 10 THEN 100 WHEN 20 THEN 150 WHEN 30 THEN 200
    WHEN 50 THEN 300 WHEN 75 THEN 400 WHEN 100 THEN 500 ELSE 10 END
$$;

-- Block direct client edits of xp/level
CREATE OR REPLACE FUNCTION public.protect_player_xp() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('app.xp_grant', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.xp IS DISTINCT FROM OLD.xp OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.level_reached_at IS DISTINCT FROM OLD.level_reached_at THEN
    RAISE EXCEPTION 'XP e nível só podem ser alterados pelo servidor';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_player_xp ON public.profiles;
CREATE TRIGGER protect_player_xp BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_player_xp();

CREATE OR REPLACE FUNCTION public.my_level_info() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.player_level_info(xp) FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.award_player_xp(p_source text, p_correct integer, p_total integer, p_duration_ms integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prof public.profiles%ROWTYPE;
  v_xp integer; v_today integer; v_last timestamptz; v_flag boolean := false;
  v_old_level integer; v_new_level integer; v_coins integer := 0; v_titles jsonb := '[]'::jsonb;
  v_t text; v_cur_titles jsonb; i integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF p_source NOT IN ('quiz','challenge','battle','battle_royale') THEN RAISE EXCEPTION 'Origem inválida'; END IF;
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF v_prof.status IN ('banned','suspended') THEN RETURN jsonb_build_object('granted',0,'reason','conta_restrita'); END IF;

  p_total := LEAST(GREATEST(COALESCE(p_total,0),0),20);
  p_correct := LEAST(GREATEST(COALESCE(p_correct,0),0),p_total);
  p_duration_ms := GREATEST(COALESCE(p_duration_ms,0),0);
  IF p_total = 0 THEN RETURN jsonb_build_object('granted',0,'reason','sem_partida'); END IF;

  v_xp := CASE p_source
    WHEN 'quiz' THEN p_correct * 10
    WHEN 'challenge' THEN p_correct * 15
    ELSE p_correct * 10 + 20 END;

  -- Abandoned rounds (less than half answered is not reported; partial = half reward)
  -- Impossibly fast: under 1.5s per question on average → flagged, no XP
  IF p_duration_ms < p_total * 1500 THEN v_flag := true; v_xp := 0; END IF;

  SELECT MAX(created_at) INTO v_last FROM public.player_xp_log WHERE user_id = v_uid;
  IF v_last IS NOT NULL AND v_last > now() - interval '10 seconds' THEN
    RETURN jsonb_build_object('granted',0,'reason','muito_rapido');
  END IF;

  SELECT COALESCE(SUM(xp),0) INTO v_today FROM public.player_xp_log
    WHERE user_id = v_uid AND created_at >= date_trunc('day', now());
  v_xp := GREATEST(0, LEAST(v_xp, 1500 - v_today));

  INSERT INTO public.player_xp_log(user_id, source, xp, correct_answers, total_questions, duration_ms, flagged)
    VALUES (v_uid, p_source, v_xp, p_correct, p_total, p_duration_ms, v_flag);

  IF v_xp = 0 THEN
    RETURN jsonb_build_object('granted',0,'reason',CASE WHEN v_flag THEN 'em_analise' ELSE 'limite_diario' END,
      'info', public.player_level_info(v_prof.xp));
  END IF;

  v_old_level := v_prof.level;
  v_new_level := (public.player_level_info(v_prof.xp + v_xp)->>'level')::int;
  v_cur_titles := COALESCE(v_prof.titles,'[]'::jsonb);
  IF v_new_level > v_old_level THEN
    FOR i IN (v_old_level+1)..v_new_level LOOP
      v_coins := v_coins + public.level_milestone_coins(i);
      v_t := public.level_title(i);
      IF v_t IS NOT NULL AND NOT (v_cur_titles ? v_t) THEN
        v_cur_titles := v_cur_titles || to_jsonb(v_t);
        v_titles := v_titles || to_jsonb(v_t);
      END IF;
    END LOOP;
  END IF;
  IF NOT (v_cur_titles ? '🌱 Iniciante') THEN v_cur_titles := v_cur_titles || to_jsonb('🌱 Iniciante'::text); END IF;

  PERFORM set_config('app.xp_grant','on',true);
  UPDATE public.profiles SET xp = xp + v_xp, level = v_new_level,
    coins = coins + LEAST(v_coins, 500), titles = v_cur_titles,
    level_reached_at = CASE WHEN v_new_level > v_old_level THEN now() ELSE level_reached_at END
  WHERE id = v_uid;
  PERFORM set_config('app.xp_grant','off',true);

  RETURN jsonb_build_object('granted',v_xp,'old_level',v_old_level,'new_level',v_new_level,
    'coins',LEAST(v_coins,500),'new_titles',v_titles,'info',public.player_level_info(v_prof.xp + v_xp));
END $$;

CREATE OR REPLACE FUNCTION public.get_xp_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, display_name text, xp integer, level integer, total_correct integer, total_answered integer, avatar_url text, active_title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.xp, p.level, p.total_correct, p.total_answered, p.avatar_url, p.active_title
  FROM public.profiles p WHERE p.status <> 'banned'
  ORDER BY p.xp DESC,
    (CASE WHEN p.total_answered > 0 THEN p.total_correct::numeric / p.total_answered ELSE 0 END) DESC,
    p.level_reached_at ASC
  LIMIT LEAST(GREATEST(p_limit,1),100)
$$;

REVOKE EXECUTE ON FUNCTION public.award_player_xp(text,integer,integer,integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.my_level_info() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_xp_leaderboard(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.award_player_xp(text,integer,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_level_info() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_xp_leaderboard(integer) TO authenticated;

-- Backfill: existing points become starting XP
ALTER TABLE public.profiles DISABLE TRIGGER protect_player_xp;
UPDATE public.profiles SET xp = total_points, level = (public.player_level_info(total_points)->>'level')::int WHERE xp = 0 AND total_points > 0;
ALTER TABLE public.profiles ENABLE TRIGGER protect_player_xp;