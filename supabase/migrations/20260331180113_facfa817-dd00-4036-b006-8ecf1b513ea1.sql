
-- Battle Royale rooms
CREATE TABLE public.battle_royale_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'waiting',
  max_players integer NOT NULL DEFAULT 10,
  current_question integer NOT NULL DEFAULT 0,
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  host_id uuid NOT NULL
);

-- Battle Royale players
CREATE TABLE public.battle_royale_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.battle_royale_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  alive boolean NOT NULL DEFAULT true,
  eliminated_at_question integer,
  score integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.battle_royale_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_royale_players ENABLE ROW LEVEL SECURITY;

-- RLS for rooms
CREATE POLICY "Anyone can view rooms" ON public.battle_royale_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create rooms" ON public.battle_royale_rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update rooms" ON public.battle_royale_rooms FOR UPDATE TO authenticated USING (auth.uid() = host_id);

-- RLS for players
CREATE POLICY "Anyone can view players" ON public.battle_royale_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join rooms" ON public.battle_royale_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own player" ON public.battle_royale_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.battle_royale_players FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_royale_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_royale_players;

-- Function to start game (only host, sets status and advances)
CREATE OR REPLACE FUNCTION public.start_battle_royale(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM battle_royale_rooms WHERE id = p_room_id AND host_id = auth.uid() AND status = 'waiting') THEN
    RAISE EXCEPTION 'Only the host can start the game';
  END IF;
  UPDATE battle_royale_rooms SET status = 'playing', current_question = 0 WHERE id = p_room_id;
END;
$$;

-- Function to advance to next question (host only)
CREATE OR REPLACE FUNCTION public.advance_battle_royale(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current integer;
  v_total integer;
  v_alive integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM battle_royale_rooms WHERE id = p_room_id AND host_id = auth.uid() AND status = 'playing') THEN
    RAISE EXCEPTION 'Only host can advance';
  END IF;
  
  SELECT current_question, jsonb_array_length(question_ids) INTO v_current, v_total FROM battle_royale_rooms WHERE id = p_room_id;
  SELECT COUNT(*) INTO v_alive FROM battle_royale_players WHERE room_id = p_room_id AND alive = true;
  
  IF v_alive <= 1 OR v_current + 1 >= v_total THEN
    UPDATE battle_royale_rooms SET status = 'finished' WHERE id = p_room_id;
  ELSE
    UPDATE battle_royale_rooms SET current_question = v_current + 1 WHERE id = p_room_id;
  END IF;
END;
$$;

-- Function to submit answer and eliminate if wrong
CREATE OR REPLACE FUNCTION public.submit_battle_royale_answer(p_room_id uuid, p_answer integer, p_correct boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current integer;
  v_player_id uuid;
BEGIN
  SELECT current_question INTO v_current FROM battle_royale_rooms WHERE id = p_room_id AND status = 'playing';
  SELECT id INTO v_player_id FROM battle_royale_players WHERE room_id = p_room_id AND user_id = auth.uid() AND alive = true;
  
  IF v_player_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Add answer
  UPDATE battle_royale_players 
  SET 
    answers = answers || jsonb_build_object('question', v_current, 'answer', p_answer, 'correct', p_correct),
    score = CASE WHEN p_correct THEN score + 10 ELSE score END,
    alive = CASE WHEN p_correct THEN true ELSE false END,
    eliminated_at_question = CASE WHEN NOT p_correct THEN v_current ELSE eliminated_at_question END
  WHERE id = v_player_id;
END;
$$;
