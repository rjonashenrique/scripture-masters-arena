
-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  total_answered integer NOT NULL DEFAULT 0,
  total_correct integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  last_play_date text NOT NULL DEFAULT '',
  easy_answered integer NOT NULL DEFAULT 0,
  easy_correct integer NOT NULL DEFAULT 0,
  medium_answered integer NOT NULL DEFAULT 0,
  medium_correct integer NOT NULL DEFAULT 0,
  hard_answered integer NOT NULL DEFAULT 0,
  hard_correct integer NOT NULL DEFAULT 0,
  total_time_ms bigint NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_lessons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Public profiles for leaderboard (read display_name and total_points)
CREATE POLICY "Anyone can view profiles for ranking" ON public.profiles
  FOR SELECT TO anon, authenticated USING (true);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
