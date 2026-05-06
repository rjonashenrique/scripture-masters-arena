-- Championship system: weekly leaderboard
CREATE TABLE public.championships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  prize_coins_1st integer NOT NULL DEFAULT 500,
  prize_coins_2nd integer NOT NULL DEFAULT 300,
  prize_coins_3rd integer NOT NULL DEFAULT 150,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.championships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view championships"
ON public.championships FOR SELECT
TO anon, authenticated
USING (true);

CREATE TABLE public.championship_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_id uuid NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 0,
  correct_answers integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (championship_id, user_id)
);

ALTER TABLE public.championship_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scores"
ON public.championship_scores FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can insert own score"
ON public.championship_scores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own score"
ON public.championship_scores FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_champ_scores_champ_points ON public.championship_scores(championship_id, points DESC);

-- Function to add points to current championship (atomic upsert+increment)
CREATE OR REPLACE FUNCTION public.add_championship_points(p_points integer, p_correct integer, p_display_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_champ_id uuid;
BEGIN
  SELECT id INTO v_champ_id FROM championships
  WHERE now() BETWEEN start_date AND end_date
  ORDER BY start_date DESC LIMIT 1;
  
  IF v_champ_id IS NULL OR auth.uid() IS NULL THEN
    RETURN;
  END IF;
  
  INSERT INTO championship_scores (championship_id, user_id, display_name, points, correct_answers)
  VALUES (v_champ_id, auth.uid(), p_display_name, p_points, p_correct)
  ON CONFLICT (championship_id, user_id) DO UPDATE
  SET points = championship_scores.points + EXCLUDED.points,
      correct_answers = championship_scores.correct_answers + EXCLUDED.correct_answers,
      display_name = EXCLUDED.display_name,
      updated_at = now();
END;
$$;

-- Seed a current weekly championship
INSERT INTO public.championships (name, description, start_date, end_date)
VALUES (
  'Campeonato Semanal',
  'Acumule pontos respondendo perguntas durante a semana e dispute o pódio!',
  date_trunc('week', now()),
  date_trunc('week', now()) + interval '7 days' - interval '1 second'
);