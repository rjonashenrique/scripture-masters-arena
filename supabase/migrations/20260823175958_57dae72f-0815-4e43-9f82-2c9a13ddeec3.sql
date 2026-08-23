CREATE TABLE public.clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL,
  description text NOT NULL DEFAULT '',
  avatar_url text,
  emblem text NOT NULL DEFAULT '🛡️',
  visibility text NOT NULL DEFAULT 'public',
  invite_code text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  owner_id uuid NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  max_members integer NOT NULL DEFAULT 20,
  xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  league text NOT NULL DEFAULT 'bronze',
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clans_name_len CHECK (char_length(name) BETWEEN 3 AND 30),
  CONSTRAINT clans_tag_len CHECK (char_length(tag) BETWEEN 2 AND 5),
  CONSTRAINT clans_desc_len CHECK (char_length(description) <= 300),
  CONSTRAINT clans_visibility_chk CHECK (visibility IN ('public','private')),
  CONSTRAINT clans_max_members_chk CHECK (max_members BETWEEN 2 AND 50)
);
CREATE UNIQUE INDEX clans_name_unique ON public.clans (lower(name)) WHERE is_active;
CREATE UNIQUE INDEX clans_tag_unique ON public.clans (upper(tag)) WHERE is_active;
CREATE UNIQUE INDEX clans_invite_code_unique ON public.clans (invite_code);
CREATE INDEX clans_league_idx ON public.clans (league, xp DESC);

CREATE TABLE public.clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'member',
  xp_contributed integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_members_role_chk CHECK (role IN ('leader','vice','member')),
  CONSTRAINT clan_members_one_clan UNIQUE (user_id)
);
CREATE INDEX clan_members_clan_idx ON public.clan_members (clan_id);

CREATE TABLE public.clan_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_applications_status_chk CHECK (status IN ('pending','accepted','rejected')),
  CONSTRAINT clan_applications_unique UNIQUE (clan_id, user_id)
);
CREATE INDEX clan_applications_clan_idx ON public.clan_applications (clan_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clans TO authenticated;
GRANT ALL ON public.clans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clan_members TO authenticated;
GRANT ALL ON public.clan_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clan_applications TO authenticated;
GRANT ALL ON public.clan_applications TO service_role;

ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_applications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.clan_role_of(_clan_id uuid, _user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.clan_members WHERE clan_id = _clan_id AND user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.my_clan_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clan_id FROM public.clan_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "Anyone authenticated can view active clans"
  ON public.clans FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "Users create their own clan"
  ON public.clans FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated can view clan members"
  ON public.clan_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can leave their clan"
  ON public.clan_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND role <> 'leader');

CREATE POLICY "View own applications or those of managed clan"
  ON public.clan_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.clan_role_of(clan_id, auth.uid()) IN ('leader','vice'));
CREATE POLICY "Users create their own application"
  ON public.clan_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.my_clan_id() IS NULL);
CREATE POLICY "Users cancel their own pending application"
  ON public.clan_applications FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending');

CREATE TRIGGER update_clans_updated_at BEFORE UPDATE ON public.clans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.create_clan(
  p_name text, p_tag text, p_description text DEFAULT '',
  p_emblem text DEFAULT '🛡️', p_visibility text DEFAULT 'public', p_display_name text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF public.my_clan_id() IS NOT NULL THEN RAISE EXCEPTION 'Você já participa de um clã'; END IF;
  IF p_visibility NOT IN ('public','private') THEN RAISE EXCEPTION 'Visibilidade inválida'; END IF;

  INSERT INTO public.clans (name, tag, description, emblem, visibility, owner_id)
  VALUES (trim(p_name), upper(trim(p_tag)), COALESCE(left(p_description,300),''), COALESCE(NULLIF(p_emblem,''),'🛡️'), p_visibility, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.clan_members (clan_id, user_id, display_name, role)
  VALUES (v_id, auth.uid(), COALESCE(NULLIF(p_display_name,''),'Jogador'), 'leader');

  DELETE FROM public.clan_applications WHERE user_id = auth.uid() AND status = 'pending';
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.update_clan(
  p_clan_id uuid, p_description text, p_emblem text, p_visibility text, p_avatar_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.clan_role_of(p_clan_id, auth.uid()) IS DISTINCT FROM 'leader' THEN
    RAISE EXCEPTION 'Apenas o líder pode editar o clã';
  END IF;
  IF p_visibility NOT IN ('public','private') THEN RAISE EXCEPTION 'Visibilidade inválida'; END IF;
  UPDATE public.clans SET
    description = COALESCE(left(p_description,300), description),
    emblem = COALESCE(NULLIF(p_emblem,''), emblem),
    visibility = p_visibility,
    avatar_url = COALESCE(p_avatar_url, avatar_url)
  WHERE id = p_clan_id AND is_active;
END; $$;

CREATE OR REPLACE FUNCTION public.request_join_clan(p_clan_id uuid, p_display_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_vis text; v_count int; v_max int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF public.my_clan_id() IS NOT NULL THEN RAISE EXCEPTION 'Você já participa de um clã'; END IF;
  SELECT visibility, member_count, max_members INTO v_vis, v_count, v_max
    FROM public.clans WHERE id = p_clan_id AND is_active FOR UPDATE;
  IF v_vis IS NULL THEN RAISE EXCEPTION 'Clã não encontrado'; END IF;
  IF v_count >= v_max THEN RAISE EXCEPTION 'Clã lotado'; END IF;

  IF v_vis = 'public' THEN
    INSERT INTO public.clan_members (clan_id, user_id, display_name, role)
    VALUES (p_clan_id, auth.uid(), COALESCE(NULLIF(p_display_name,''),'Jogador'), 'member');
    UPDATE public.clans SET member_count = member_count + 1 WHERE id = p_clan_id;
    DELETE FROM public.clan_applications WHERE user_id = auth.uid();
    RETURN 'joined';
  END IF;

  INSERT INTO public.clan_applications (clan_id, user_id, display_name)
  VALUES (p_clan_id, auth.uid(), COALESCE(NULLIF(p_display_name,''),'Jogador'))
  ON CONFLICT (clan_id, user_id) DO UPDATE SET status = 'pending', created_at = now();
  RETURN 'requested';
END; $$;

CREATE OR REPLACE FUNCTION public.accept_clan_application(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clan uuid; v_user uuid; v_name text; v_count int; v_max int;
BEGIN
  SELECT clan_id, user_id, display_name INTO v_clan, v_user, v_name
    FROM public.clan_applications WHERE id = p_request_id AND status = 'pending';
  IF v_clan IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF public.clan_role_of(v_clan, auth.uid()) NOT IN ('leader','vice') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = v_user) THEN
    UPDATE public.clan_applications SET status = 'rejected' WHERE id = p_request_id;
    RAISE EXCEPTION 'Jogador já está em um clã';
  END IF;
  SELECT member_count, max_members INTO v_count, v_max FROM public.clans WHERE id = v_clan FOR UPDATE;
  IF v_count >= v_max THEN RAISE EXCEPTION 'Clã lotado'; END IF;

  INSERT INTO public.clan_members (clan_id, user_id, display_name, role)
  VALUES (v_clan, v_user, COALESCE(NULLIF(v_name,''),'Jogador'), 'member');
  UPDATE public.clans SET member_count = member_count + 1 WHERE id = v_clan;
  UPDATE public.clan_applications SET status = 'accepted' WHERE id = p_request_id;
  DELETE FROM public.clan_applications WHERE user_id = v_user AND status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION public.reject_clan_application(p_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clan uuid;
BEGIN
  SELECT clan_id INTO v_clan FROM public.clan_applications WHERE id = p_request_id AND status = 'pending';
  IF v_clan IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado'; END IF;
  IF public.clan_role_of(v_clan, auth.uid()) NOT IN ('leader','vice') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  UPDATE public.clan_applications SET status = 'rejected' WHERE id = p_request_id;
END; $$;

CREATE OR REPLACE FUNCTION public.set_clan_member_role(p_clan_id uuid, p_target uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_role NOT IN ('member','vice') THEN RAISE EXCEPTION 'Use a transferência de liderança'; END IF;
  IF public.clan_role_of(p_clan_id, auth.uid()) IS DISTINCT FROM 'leader' THEN RAISE EXCEPTION 'Apenas o líder pode alterar cargos'; END IF;
  IF p_target = auth.uid() THEN RAISE EXCEPTION 'O líder não pode alterar o próprio cargo'; END IF;
  UPDATE public.clan_members SET role = p_role
    WHERE clan_id = p_clan_id AND user_id = p_target AND role <> 'leader';
END; $$;

CREATE OR REPLACE FUNCTION public.kick_clan_member_v2(p_clan_id uuid, p_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me text; v_target text;
BEGIN
  v_me := public.clan_role_of(p_clan_id, auth.uid());
  v_target := public.clan_role_of(p_clan_id, p_target);
  IF v_me IS NULL OR v_me NOT IN ('leader','vice') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF v_target IS NULL THEN RAISE EXCEPTION 'Jogador não é membro'; END IF;
  IF v_target = 'leader' THEN RAISE EXCEPTION 'Não é possível remover o líder'; END IF;
  IF v_me = 'vice' AND v_target <> 'member' THEN RAISE EXCEPTION 'Vice só pode remover membros comuns'; END IF;
  DELETE FROM public.clan_members WHERE clan_id = p_clan_id AND user_id = p_target;
  UPDATE public.clans SET member_count = GREATEST(member_count - 1, 0) WHERE id = p_clan_id;
END; $$;

CREATE OR REPLACE FUNCTION public.leave_clan()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_clan uuid; v_role text;
BEGIN
  SELECT clan_id, role INTO v_clan, v_role FROM public.clan_members WHERE user_id = auth.uid();
  IF v_clan IS NULL THEN RETURN; END IF;
  IF v_role = 'leader' THEN RAISE EXCEPTION 'Transfira a liderança antes de sair'; END IF;
  DELETE FROM public.clan_members WHERE clan_id = v_clan AND user_id = auth.uid();
  UPDATE public.clans SET member_count = GREATEST(member_count - 1, 0) WHERE id = v_clan;
END; $$;

CREATE OR REPLACE FUNCTION public.transfer_clan_lead(p_clan_id uuid, p_new_leader uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.clan_role_of(p_clan_id, auth.uid()) IS DISTINCT FROM 'leader' THEN RAISE EXCEPTION 'Apenas o líder pode transferir'; END IF;
  IF public.clan_role_of(p_clan_id, p_new_leader) IS NULL THEN RAISE EXCEPTION 'Jogador não é membro'; END IF;
  UPDATE public.clan_members SET role = 'vice' WHERE clan_id = p_clan_id AND user_id = auth.uid();
  UPDATE public.clan_members SET role = 'leader' WHERE clan_id = p_clan_id AND user_id = p_new_leader;
  UPDATE public.clans SET owner_id = p_new_leader WHERE id = p_clan_id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_clan_v2(p_clan_id uuid, p_confirm_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text;
BEGIN
  IF public.clan_role_of(p_clan_id, auth.uid()) IS DISTINCT FROM 'leader' THEN RAISE EXCEPTION 'Apenas o líder pode excluir o clã'; END IF;
  SELECT name INTO v_name FROM public.clans WHERE id = p_clan_id AND is_active;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Clã não encontrado'; END IF;
  IF lower(trim(COALESCE(p_confirm_name,''))) <> lower(v_name) THEN RAISE EXCEPTION 'Nome de confirmação incorreto'; END IF;
  UPDATE public.clans SET is_active = false, deleted_at = now(), member_count = 0 WHERE id = p_clan_id;
  DELETE FROM public.clan_members WHERE clan_id = p_clan_id;
  UPDATE public.clan_applications SET status = 'rejected' WHERE clan_id = p_clan_id AND status = 'pending';
END; $$;

CREATE OR REPLACE FUNCTION public.search_clans(p_query text DEFAULT '', p_limit integer DEFAULT 30)
RETURNS TABLE(id uuid, name text, tag text, description text, emblem text, visibility text,
              member_count integer, max_members integer, xp integer, level integer, league text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.tag, c.description, c.emblem, c.visibility,
         c.member_count, c.max_members, c.xp, c.level, c.league
  FROM public.clans c
  WHERE c.is_active
    AND (COALESCE(trim(p_query),'') = ''
         OR c.name ILIKE '%' || p_query || '%'
         OR c.tag ILIKE '%' || p_query || '%')
  ORDER BY c.xp DESC, c.member_count DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit,30),1),100);
$$;