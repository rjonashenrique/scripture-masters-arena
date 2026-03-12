
-- Churches table
CREATE TABLE public.churches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  denomination text NOT NULL DEFAULT '',
  code text NOT NULL UNIQUE,
  owner_id uuid NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Church members table
CREATE TABLE public.church_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  points_contributed integer NOT NULL DEFAULT 0,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_members ENABLE ROW LEVEL SECURITY;

-- Churches policies
CREATE POLICY "Anyone can view churches" ON public.churches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create churches" ON public.churches FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update church" ON public.churches FOR UPDATE TO authenticated USING (auth.uid() = owner_id);

-- Church members policies
CREATE POLICY "Anyone can view members" ON public.church_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join church" ON public.church_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave church" ON public.church_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own membership" ON public.church_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Trigger for updated_at on churches
CREATE TRIGGER update_churches_updated_at
  BEFORE UPDATE ON public.churches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get church total points (aggregated from member profiles)
CREATE OR REPLACE FUNCTION public.get_church_stats(p_church_id uuid)
RETURNS TABLE(total_points bigint, member_count bigint, avg_points numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COALESCE(SUM(p.total_points), 0) as total_points,
    COUNT(cm.id) as member_count,
    COALESCE(AVG(p.total_points), 0) as avg_points
  FROM public.church_members cm
  JOIN public.profiles p ON p.id = cm.user_id
  WHERE cm.church_id = p_church_id;
$$;
