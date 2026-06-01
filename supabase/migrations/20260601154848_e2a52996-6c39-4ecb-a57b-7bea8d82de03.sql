-- 1) PROFILES: stop exposing all columns publicly; provide a safe leaderboard function
DROP POLICY IF EXISTS "Anyone can view profiles for ranking" ON public.profiles;
-- "Users can view own profile" (auth.uid() = id) remains in place

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  display_name text,
  total_points integer,
  total_correct integer,
  total_answered integer,
  best_streak integer,
  avatar_url text,
  active_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, display_name, total_points, total_correct, total_answered, best_streak, avatar_url, active_title
  FROM public.profiles
  ORDER BY total_points DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
$$;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;

-- 2) BATTLES: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can create battles" ON public.battles;
DROP POLICY IF EXISTS "Anyone can update battles" ON public.battles;
DROP POLICY IF EXISTS "Anyone can view battles" ON public.battles;

CREATE POLICY "Authenticated can view battles"
  ON public.battles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create battles"
  ON public.battles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update battles"
  ON public.battles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3) CHURCH_MEMBERS: prevent self role escalation
DROP POLICY IF EXISTS "Users can join church" ON public.church_members;
CREATE POLICY "Users can join church"
  ON public.church_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'member');

DROP POLICY IF EXISTS "Users can update own membership" ON public.church_members;
CREATE POLICY "Users can update own membership"
  ON public.church_members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = 'member');

-- 4) CHAMPIONSHIP_SCORES: force writes through the secure RPC
DROP POLICY IF EXISTS "Users can insert own score" ON public.championship_scores;
DROP POLICY IF EXISTS "Users can update own score" ON public.championship_scores;

-- 5) BATTLE_ROYALE_PLAYERS: force score/alive changes through the secure RPC
DROP POLICY IF EXISTS "Users can update own player" ON public.battle_royale_players;