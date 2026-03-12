
-- Weekly challenges table
CREATE TABLE public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT '🎯',
  challenge_type text NOT NULL,
  target_value integer NOT NULL,
  reward_coins integer NOT NULL DEFAULT 50,
  week_start date NOT NULL,
  week_end date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Church challenge progress
CREATE TABLE public.church_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  challenge_id uuid REFERENCES public.weekly_challenges(id) ON DELETE CASCADE NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (church_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Weekly challenges: anyone authenticated can view
CREATE POLICY "Anyone can view challenges" ON public.weekly_challenges FOR SELECT TO authenticated USING (true);

-- Church challenge progress policies
CREATE POLICY "Anyone can view challenge progress" ON public.church_challenge_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can insert progress" ON public.church_challenge_progress FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.church_members WHERE church_id = church_challenge_progress.church_id AND user_id = auth.uid()));
CREATE POLICY "Members can update progress" ON public.church_challenge_progress FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.church_members WHERE church_id = church_challenge_progress.church_id AND user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_church_challenge_progress_updated_at
  BEFORE UPDATE ON public.church_challenge_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to contribute to challenge progress
CREATE OR REPLACE FUNCTION public.contribute_challenge_progress(
  p_church_id uuid,
  p_challenge_type text,
  p_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update progress for all active challenges of this type for this church
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
