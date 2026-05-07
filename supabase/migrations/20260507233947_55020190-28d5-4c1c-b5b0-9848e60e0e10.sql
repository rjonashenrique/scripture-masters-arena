ALTER TABLE public.championship_scores REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.championship_scores;