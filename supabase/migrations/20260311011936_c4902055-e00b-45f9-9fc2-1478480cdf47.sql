-- Create battles table for 1v1 matches
CREATE TABLE public.battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  player1_name TEXT NOT NULL,
  player2_name TEXT,
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  player1_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  player2_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_question INTEGER NOT NULL DEFAULT 0,
  question_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read battles (needed for real-time)
CREATE POLICY "Anyone can view battles" ON public.battles
  FOR SELECT USING (true);

-- Allow anyone to create battles
CREATE POLICY "Anyone can create battles" ON public.battles
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update battles
CREATE POLICY "Anyone can update battles" ON public.battles
  FOR UPDATE USING (true);

-- Enable realtime for battles
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_battles_updated_at
  BEFORE UPDATE ON public.battles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();