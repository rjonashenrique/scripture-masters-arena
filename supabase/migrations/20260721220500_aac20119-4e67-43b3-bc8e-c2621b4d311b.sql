
-- 1. app_config: RLS enabled but no policy (info finding). Add explicit deny-all for client roles.
CREATE POLICY "No client access to app_config" ON public.app_config
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);

-- 2. battle_royale_players: add explicit restrictive no-direct-update policy.
CREATE POLICY "No direct updates to battle royale players" ON public.battle_royale_players
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);

-- 3. battles: drop the permissive UPDATE policy and route through RPCs.
DROP POLICY IF EXISTS "Authenticated can update battles" ON public.battles;

CREATE OR REPLACE FUNCTION public.join_battle(p_code text, p_player_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.battles
    SET player2_name = COALESCE(NULLIF(p_player_name, ''), 'Player'),
        status = 'playing',
        updated_at = now()
    WHERE code = upper(p_code) AND status = 'waiting'
    RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Battle not found or already started'; END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_battle_answer(
  p_battle_id uuid, p_player_num int, p_question_index int, p_answer int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qids jsonb; v_status text; v_qid int; v_correct int;
  v_diff text; v_pts int := 0;
  v_prev_answers jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_player_num NOT IN (1,2) THEN RAISE EXCEPTION 'Invalid player'; END IF;

  SELECT question_ids, status INTO v_qids, v_status
    FROM public.battles WHERE id = p_battle_id FOR UPDATE;
  IF v_status <> 'playing' THEN RAISE EXCEPTION 'Battle not active'; END IF;
  IF p_question_index < 0 OR p_question_index >= jsonb_array_length(v_qids) THEN
    RAISE EXCEPTION 'Invalid question index';
  END IF;

  v_qid := (v_qids ->> p_question_index)::int;
  SELECT correct_answer, difficulty INTO v_correct, v_diff
    FROM public.quiz_questions WHERE id = v_qid;
  IF v_correct IS NOT NULL AND p_answer = v_correct THEN
    v_pts := CASE v_diff WHEN 'easy' THEN 10 WHEN 'medium' THEN 20 WHEN 'hard' THEN 40 ELSE 10 END;
  END IF;

  IF p_player_num = 1 THEN
    SELECT player1_answers INTO v_prev_answers FROM public.battles WHERE id = p_battle_id;
    IF jsonb_array_length(v_prev_answers) <> p_question_index THEN
      RAISE EXCEPTION 'Out of order answer';
    END IF;
    UPDATE public.battles
      SET player1_answers = v_prev_answers || to_jsonb(p_answer),
          player1_score = player1_score + v_pts,
          updated_at = now()
      WHERE id = p_battle_id;
  ELSE
    SELECT player2_answers INTO v_prev_answers FROM public.battles WHERE id = p_battle_id;
    IF jsonb_array_length(v_prev_answers) <> p_question_index THEN
      RAISE EXCEPTION 'Out of order answer';
    END IF;
    UPDATE public.battles
      SET player2_answers = v_prev_answers || to_jsonb(p_answer),
          player2_score = player2_score + v_pts,
          updated_at = now()
      WHERE id = p_battle_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_battle(p_battle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_total int; v_a1 int; v_a2 int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT jsonb_array_length(question_ids),
         jsonb_array_length(player1_answers),
         jsonb_array_length(player2_answers)
    INTO v_total, v_a1, v_a2
    FROM public.battles WHERE id = p_battle_id;
  IF v_a1 >= v_total AND v_a2 >= v_total THEN
    UPDATE public.battles SET status = 'finished', updated_at = now() WHERE id = p_battle_id;
  END IF;
END;
$$;

-- 4. church_members: remove the direct UPDATE policy — points_contributed and role must go through RPCs.
DROP POLICY IF EXISTS "Users can update own membership" ON public.church_members;

-- 5. contribute_challenge_progress: add auth + membership guard and amount cap.
CREATE OR REPLACE FUNCTION public.contribute_challenge_progress(
  p_church_id uuid, p_challenge_type text, p_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.church_members
    WHERE church_id = p_church_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this church';
  END IF;

  UPDATE public.church_challenge_progress cp
  SET
    current_value = LEAST(cp.current_value + p_amount, wc.target_value),
    completed = CASE WHEN cp.current_value + p_amount >= wc.target_value THEN true ELSE false END,
    completed_at = CASE WHEN cp.current_value + p_amount >= wc.target_value AND cp.completed = false THEN now() ELSE cp.completed_at END
  FROM public.weekly_challenges wc
  WHERE cp.challenge_id = wc.id
    AND cp.church_id = p_church_id
    AND wc.challenge_type = p_challenge_type
    AND wc.week_start <= CURRENT_DATE
    AND wc.week_end >= CURRENT_DATE
    AND cp.completed = false;
END;
$$;

-- 6. profiles: guard against inflated stat syncs from client localStorage.
CREATE OR REPLACE FUNCTION public.validate_profile_stats_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Allow service_role/admin unrestricted updates (bypasses RLS anyway).
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Reject monotonic-only fields going backwards
  IF NEW.total_answered < OLD.total_answered
     OR NEW.total_correct < OLD.total_correct
     OR NEW.total_points < OLD.total_points
     OR NEW.best_streak  < OLD.best_streak THEN
    RAISE EXCEPTION 'Stats cannot decrease';
  END IF;

  -- Cap per-update deltas to plausible per-session values
  IF (NEW.total_answered - OLD.total_answered) > 50 THEN
    RAISE EXCEPTION 'total_answered delta too large';
  END IF;
  IF (NEW.total_correct - OLD.total_correct) > 50 THEN
    RAISE EXCEPTION 'total_correct delta too large';
  END IF;
  IF (NEW.total_points - OLD.total_points) > 2000 THEN
    RAISE EXCEPTION 'total_points delta too large';
  END IF;
  IF (NEW.coins - OLD.coins) > 500 THEN
    RAISE EXCEPTION 'coins delta too large';
  END IF;
  IF (NEW.total_correct - OLD.total_correct) > (NEW.total_answered - OLD.total_answered) THEN
    RAISE EXCEPTION 'correct cannot exceed answered';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_stats_update ON public.profiles;
CREATE TRIGGER validate_profile_stats_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_stats_update();
