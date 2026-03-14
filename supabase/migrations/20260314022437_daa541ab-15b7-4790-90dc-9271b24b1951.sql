
-- Add role to church_members
ALTER TABLE public.church_members ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Add clan features to churches
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 20;
ALTER TABLE public.churches ADD COLUMN IF NOT EXISTS league_tier text NOT NULL DEFAULT 'bronze';

-- Join requests table
CREATE TABLE IF NOT EXISTS public.clan_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid NOT NULL REFERENCES public.churches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(church_id, user_id)
);

ALTER TABLE public.clan_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS for join requests
CREATE POLICY "Users can view requests for their clan" ON public.clan_join_requests
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.church_members WHERE church_id = clan_join_requests.church_id AND user_id = auth.uid() AND role IN ('leader', 'vice'))
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create join requests" ON public.clan_join_requests
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Leaders can update requests" ON public.clan_join_requests
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.church_members WHERE church_id = clan_join_requests.church_id AND user_id = auth.uid() AND role IN ('leader', 'vice'))
);

CREATE POLICY "Users can delete own requests" ON public.clan_join_requests
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Function: transfer leadership
CREATE OR REPLACE FUNCTION public.transfer_clan_leadership(p_church_id uuid, p_new_leader_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is current leader
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = p_church_id AND user_id = auth.uid() AND role = 'leader') THEN
    RAISE EXCEPTION 'Only the leader can transfer leadership';
  END IF;
  -- Verify target is a member
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = p_church_id AND user_id = p_new_leader_id) THEN
    RAISE EXCEPTION 'Target user is not a member';
  END IF;
  -- Demote current leader
  UPDATE church_members SET role = 'member' WHERE church_id = p_church_id AND user_id = auth.uid();
  -- Promote new leader
  UPDATE church_members SET role = 'leader' WHERE church_id = p_church_id AND user_id = p_new_leader_id;
  -- Update church owner
  UPDATE churches SET owner_id = p_new_leader_id WHERE id = p_church_id;
END;
$$;

-- Function: promote/demote member
CREATE OR REPLACE FUNCTION public.set_member_role(p_church_id uuid, p_target_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role NOT IN ('member', 'vice') THEN
    RAISE EXCEPTION 'Invalid role. Use transfer_clan_leadership for leader.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = p_church_id AND user_id = auth.uid() AND role = 'leader') THEN
    RAISE EXCEPTION 'Only the leader can change roles';
  END IF;
  UPDATE church_members SET role = p_role WHERE church_id = p_church_id AND user_id = p_target_user_id;
END;
$$;

-- Function: kick member
CREATE OR REPLACE FUNCTION public.kick_clan_member(p_church_id uuid, p_target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = p_church_id AND user_id = auth.uid() AND role IN ('leader', 'vice')) THEN
    RAISE EXCEPTION 'Only leader or vice can kick members';
  END IF;
  -- Cannot kick leader
  IF EXISTS (SELECT 1 FROM church_members WHERE church_id = p_church_id AND user_id = p_target_user_id AND role = 'leader') THEN
    RAISE EXCEPTION 'Cannot kick the leader';
  END IF;
  DELETE FROM church_members WHERE church_id = p_church_id AND user_id = p_target_user_id;
END;
$$;

-- Function: accept join request
CREATE OR REPLACE FUNCTION public.accept_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id uuid;
  v_user_id uuid;
  v_max_members integer;
  v_current_count integer;
BEGIN
  SELECT church_id, user_id INTO v_church_id, v_user_id
  FROM clan_join_requests WHERE id = p_request_id AND status = 'pending';
  
  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = v_church_id AND user_id = auth.uid() AND role IN ('leader', 'vice')) THEN
    RAISE EXCEPTION 'Only leader or vice can accept requests';
  END IF;
  
  SELECT max_members INTO v_max_members FROM churches WHERE id = v_church_id;
  SELECT COUNT(*) INTO v_current_count FROM church_members WHERE church_id = v_church_id;
  
  IF v_current_count >= v_max_members THEN
    RAISE EXCEPTION 'Clan is full';
  END IF;
  
  INSERT INTO church_members (church_id, user_id, role) VALUES (v_church_id, v_user_id, 'member');
  UPDATE clan_join_requests SET status = 'accepted' WHERE id = p_request_id;
  DELETE FROM clan_join_requests WHERE church_id = v_church_id AND user_id = v_user_id AND status = 'pending' AND id != p_request_id;
END;
$$;

-- Function: reject join request
CREATE OR REPLACE FUNCTION public.reject_join_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_church_id uuid;
BEGIN
  SELECT church_id INTO v_church_id FROM clan_join_requests WHERE id = p_request_id AND status = 'pending';
  
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = v_church_id AND user_id = auth.uid() AND role IN ('leader', 'vice')) THEN
    RAISE EXCEPTION 'Only leader or vice can reject requests';
  END IF;
  
  UPDATE clan_join_requests SET status = 'rejected' WHERE id = p_request_id;
END;
$$;

-- Function: delete clan (leader only)
CREATE OR REPLACE FUNCTION public.delete_clan(p_church_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM church_members WHERE church_id = p_church_id AND user_id = auth.uid() AND role = 'leader') THEN
    RAISE EXCEPTION 'Only the leader can delete the clan';
  END IF;
  DELETE FROM church_members WHERE church_id = p_church_id;
  DELETE FROM clan_join_requests WHERE church_id = p_church_id;
  DELETE FROM church_challenge_progress WHERE church_id = p_church_id;
  DELETE FROM churches WHERE id = p_church_id;
END;
$$;

-- Function: get league tier based on points
CREATE OR REPLACE FUNCTION public.get_league_tier(p_points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_points >= 50000 THEN 'legend'
    WHEN p_points >= 30000 THEN 'master'
    WHEN p_points >= 15000 THEN 'diamond'
    WHEN p_points >= 7500 THEN 'gold'
    WHEN p_points >= 3000 THEN 'silver'
    ELSE 'bronze'
  END;
$$;
