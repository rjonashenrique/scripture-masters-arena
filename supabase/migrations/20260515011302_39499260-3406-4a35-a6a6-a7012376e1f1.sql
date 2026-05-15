
-- Extensions for cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Tournaments
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'registration', -- registration | active | finished
  registration_start TIMESTAMPTZ NOT NULL,
  registration_end TIMESTAMPTZ NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  bracket_size INTEGER NOT NULL DEFAULT 16,
  total_rounds INTEGER NOT NULL DEFAULT 4,
  current_round INTEGER NOT NULL DEFAULT 0,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT TO authenticated USING (true);

-- Registrations
CREATE TABLE public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  seed INTEGER,
  eliminated_round INTEGER,
  final_place INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view registrations" ON public.tournament_registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can withdraw" ON public.tournament_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Matches
CREATE TABLE public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_index INTEGER NOT NULL,
  player1_id UUID,
  player2_id UUID,
  player1_name TEXT DEFAULT '',
  player2_name TEXT DEFAULT '',
  player1_score INTEGER,
  player2_score INTEGER,
  winner_id UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | finished | bye
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON public.tournament_matches FOR SELECT TO authenticated USING (true);

-- Rewards
CREATE TABLE public.tournament_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  place INTEGER NOT NULL,
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tournament_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rewards" ON public.tournament_rewards FOR SELECT TO authenticated USING (true);

-- Profile additions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS titles JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS active_title TEXT NOT NULL DEFAULT '';

-- Indexes
CREATE INDEX idx_matches_tournament_round ON public.tournament_matches(tournament_id, round);
CREATE INDEX idx_matches_players ON public.tournament_matches(player1_id, player2_id);
CREATE INDEX idx_registrations_tournament ON public.tournament_registrations(tournament_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournament_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tournaments;

-- ===== RPCs =====

-- Register
CREATE OR REPLACE FUNCTION public.register_tournament(p_tournament_id UUID, p_display_name TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status TEXT;
  v_reg_end TIMESTAMPTZ;
  v_size INTEGER;
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT status, registration_end, bracket_size INTO v_status, v_reg_end, v_size
    FROM tournaments WHERE id = p_tournament_id;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF v_status <> 'registration' OR now() > v_reg_end THEN
    RAISE EXCEPTION 'Registration is closed';
  END IF;
  SELECT COUNT(*) INTO v_count FROM tournament_registrations WHERE tournament_id = p_tournament_id;
  IF v_count >= v_size THEN RAISE EXCEPTION 'Bracket is full'; END IF;
  INSERT INTO tournament_registrations (tournament_id, user_id, display_name)
    VALUES (p_tournament_id, auth.uid(), COALESCE(p_display_name, ''))
    ON CONFLICT (tournament_id, user_id) DO NOTHING;
END;
$$;

-- Submit score and try to resolve match
CREATE OR REPLACE FUNCTION public.submit_tournament_score(p_match_id UUID, p_score INTEGER)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_p1 UUID; v_p2 UUID;
  v_s1 INTEGER; v_s2 INTEGER;
  v_status TEXT;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT player1_id, player2_id, player1_score, player2_score, status
    INTO v_p1, v_p2, v_s1, v_s2, v_status
    FROM tournament_matches WHERE id = p_match_id FOR UPDATE;
  IF v_status <> 'pending' THEN RAISE EXCEPTION 'Match already finished'; END IF;
  IF v_uid = v_p1 THEN
    IF v_s1 IS NOT NULL THEN RAISE EXCEPTION 'Already played'; END IF;
    UPDATE tournament_matches SET player1_score = p_score, updated_at = now() WHERE id = p_match_id;
    v_s1 := p_score;
  ELSIF v_uid = v_p2 THEN
    IF v_s2 IS NOT NULL THEN RAISE EXCEPTION 'Already played'; END IF;
    UPDATE tournament_matches SET player2_score = p_score, updated_at = now() WHERE id = p_match_id;
    v_s2 := p_score;
  ELSE
    RAISE EXCEPTION 'Not a player in this match';
  END IF;
  -- If both have played, resolve immediately
  IF v_s1 IS NOT NULL AND v_s2 IS NOT NULL THEN
    UPDATE tournament_matches
      SET winner_id = CASE
        WHEN v_s1 > v_s2 THEN v_p1
        WHEN v_s2 > v_s1 THEN v_p2
        ELSE v_p1 -- tiebreak: player1 (higher seed)
      END,
      status = 'finished',
      updated_at = now()
      WHERE id = p_match_id;
  END IF;
END;
$$;

-- Set active title
CREATE OR REPLACE FUNCTION public.set_active_title(p_title TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_titles JSONB;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_title = '' THEN
    UPDATE profiles SET active_title = '' WHERE id = auth.uid();
    RETURN;
  END IF;
  SELECT titles INTO v_titles FROM profiles WHERE id = auth.uid();
  IF NOT (v_titles ? p_title) THEN RAISE EXCEPTION 'Title not owned'; END IF;
  UPDATE profiles SET active_title = p_title WHERE id = auth.uid();
END;
$$;

-- Updated-at trigger
CREATE TRIGGER tournaments_updated_at BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tournament_matches_updated_at BEFORE UPDATE ON public.tournament_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
