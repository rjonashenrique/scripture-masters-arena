-- ============ clan_invites ============
CREATE TABLE public.clan_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_name text NOT NULL DEFAULT '',
  token_hash text NOT NULL,
  invite_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clan_invites_status_chk CHECK (status IN ('pending','accepted','declined','expired','cancelled'))
);

CREATE UNIQUE INDEX clan_invites_code_key ON public.clan_invites(invite_code);
CREATE UNIQUE INDEX clan_invites_token_key ON public.clan_invites(token_hash);
CREATE UNIQUE INDEX clan_invites_unique_pending
  ON public.clan_invites(clan_id, invited_user_id)
  WHERE status = 'pending' AND invited_user_id IS NOT NULL;
CREATE INDEX clan_invites_invited_user_idx ON public.clan_invites(invited_user_id, status);
CREATE INDEX clan_invites_clan_idx ON public.clan_invites(clan_id, status);

GRANT SELECT ON public.clan_invites TO authenticated;
GRANT ALL ON public.clan_invites TO service_role;

ALTER TABLE public.clan_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invited user can view own invites"
  ON public.clan_invites FOR SELECT TO authenticated
  USING (invited_user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Clan managers can view clan invites"
  ON public.clan_invites FOR SELECT TO authenticated
  USING (public.clan_role_of(clan_id, auth.uid()) IN ('leader','vice'));

CREATE TRIGGER clan_invites_updated_at
  BEFORE UPDATE ON public.clan_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ helpers ============
CREATE OR REPLACE FUNCTION public.gen_invite_code()
RETURNS text LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  tries int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clan_invites WHERE invite_code = code);
    tries := tries + 1;
    IF tries > 25 THEN RAISE EXCEPTION 'Não foi possível gerar código'; END IF;
  END LOOP;
  RETURN code;
END; $$;

-- ============ busca de jogadores ============
CREATE OR REPLACE FUNCTION public.search_players(p_query text, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  display_name text,
  avatar_url text,
  total_points integer,
  in_clan boolean,
  invited boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.avatar_url, p.total_points,
         EXISTS (SELECT 1 FROM public.clan_members cm WHERE cm.user_id = p.id) AS in_clan,
         EXISTS (
           SELECT 1 FROM public.clan_invites ci
           WHERE ci.invited_user_id = p.id
             AND ci.status = 'pending'
             AND ci.expires_at > now()
             AND ci.clan_id = public.my_clan_id()
         ) AS invited
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id <> auth.uid()
    AND (coalesce(p_query,'') = '' OR p.display_name ILIKE '%' || p_query || '%')
  ORDER BY p.total_points DESC
  LIMIT LEAST(COALESCE(p_limit, 20), 50);
$$;

-- ============ criar convite ============
CREATE OR REPLACE FUNCTION public.create_clan_invite(
  p_clan_id uuid,
  p_invited_user_id uuid DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_token text;
  v_code text;
  v_name text;
  v_id uuid;
  v_clan public.clans%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  v_role := public.clan_role_of(p_clan_id, v_uid);
  IF v_role IS NULL OR v_role NOT IN ('leader','vice') THEN
    RAISE EXCEPTION 'Apenas líder e vice-líder podem convidar';
  END IF;

  SELECT * INTO v_clan FROM public.clans WHERE id = p_clan_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clã não encontrado'; END IF;
  IF v_clan.member_count >= LEAST(v_clan.max_members, 20) THEN
    RAISE EXCEPTION 'Este clã atingiu o limite de 20 membros.';
  END IF;

  IF p_invited_user_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = p_invited_user_id) THEN
      RAISE EXCEPTION 'Este jogador já pertence a um clã';
    END IF;
    UPDATE public.clan_invites
      SET status = 'expired'
      WHERE clan_id = p_clan_id AND invited_user_id = p_invited_user_id
        AND status = 'pending' AND expires_at <= now();
    IF EXISTS (
      SELECT 1 FROM public.clan_invites
      WHERE clan_id = p_clan_id AND invited_user_id = p_invited_user_id
        AND status = 'pending' AND expires_at > now()
    ) THEN
      RAISE EXCEPTION 'Já existe um convite pendente para este jogador';
    END IF;
  END IF;

  SELECT display_name INTO v_name FROM public.profiles WHERE id = v_uid;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_code := public.gen_invite_code();

  INSERT INTO public.clan_invites (clan_id, invited_user_id, invited_by, invited_by_name, token_hash, invite_code)
  VALUES (p_clan_id, p_invited_user_id, v_uid, COALESCE(v_name,'Jogador'), encode(digest(v_token,'sha256'),'hex'), v_code)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'code', v_code);
END; $$;

-- ============ preview do convite ============
CREATE OR REPLACE FUNCTION public.preview_clan_invite(p_token text DEFAULT NULL, p_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv public.clan_invites%ROWTYPE;
  v_clan public.clans%ROWTYPE;
BEGIN
  IF p_token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites WHERE token_hash = encode(digest(p_token,'sha256'),'hex');
  ELSIF p_code IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites WHERE invite_code = upper(trim(p_code));
  END IF;

  IF NOT FOUND OR v_inv.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  SELECT * INTO v_clan FROM public.clans WHERE id = v_inv.clan_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'clan_missing'); END IF;

  RETURN jsonb_build_object(
    'valid', (v_inv.status = 'pending' AND v_inv.expires_at > now()),
    'reason', CASE
      WHEN v_inv.status <> 'pending' THEN v_inv.status
      WHEN v_inv.expires_at <= now() THEN 'expired'
      ELSE 'ok' END,
    'invite_id', v_inv.id,
    'invited_by_name', v_inv.invited_by_name,
    'invited_user_id', v_inv.invited_user_id,
    'expires_at', v_inv.expires_at,
    'clan', jsonb_build_object(
      'id', v_clan.id, 'name', v_clan.name, 'tag', v_clan.tag, 'emblem', v_clan.emblem,
      'description', v_clan.description, 'league', v_clan.league, 'level', v_clan.level,
      'xp', v_clan.xp, 'member_count', v_clan.member_count, 'max_members', v_clan.max_members
    )
  );
END; $$;

GRANT EXECUTE ON FUNCTION public.preview_clan_invite(text, text) TO anon, authenticated;

-- ============ aceitar convite ============
CREATE OR REPLACE FUNCTION public.accept_clan_invite(
  p_token text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_display_name text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.clan_invites%ROWTYPE;
  v_clan public.clans%ROWTYPE;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  IF p_token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites
      WHERE token_hash = encode(digest(p_token,'sha256'),'hex') FOR UPDATE;
  ELSIF p_code IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites
      WHERE invite_code = upper(trim(p_code)) FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Convite inválido';
  END IF;

  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Convite inválido'; END IF;
  IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'Este convite não está mais disponível'; END IF;
  IF v_inv.expires_at <= now() THEN
    UPDATE public.clan_invites SET status = 'expired' WHERE id = v_inv.id;
    RAISE EXCEPTION 'Este convite expirou';
  END IF;
  IF v_inv.invited_user_id IS NOT NULL AND v_inv.invited_user_id <> v_uid THEN
    RAISE EXCEPTION 'Este convite é de outro jogador';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clan_members WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Você já pertence a um clã';
  END IF;

  SELECT * INTO v_clan FROM public.clans WHERE id = v_inv.clan_id AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clã não encontrado'; END IF;
  IF v_clan.member_count >= LEAST(v_clan.max_members, 20) THEN
    RAISE EXCEPTION 'Este clã atingiu o limite de 20 membros.';
  END IF;

  SELECT COALESCE(NULLIF(trim(COALESCE(p_display_name,'')),''), display_name, 'Jogador')
    INTO v_name FROM public.profiles WHERE id = v_uid;

  INSERT INTO public.clan_members (clan_id, user_id, display_name, role)
  VALUES (v_clan.id, v_uid, COALESCE(v_name,'Jogador'), 'member');

  UPDATE public.clans SET member_count = member_count + 1, updated_at = now() WHERE id = v_clan.id;

  UPDATE public.clan_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_inv.id;

  -- limpa convites pendentes do jogador em outros clãs
  UPDATE public.clan_invites SET status = 'cancelled'
    WHERE invited_user_id = v_uid AND status = 'pending' AND id <> v_inv.id;

  DELETE FROM public.clan_applications WHERE user_id = v_uid AND status = 'pending';

  RETURN v_clan.id;
END; $$;

-- ============ recusar / cancelar ============
CREATE OR REPLACE FUNCTION public.decline_clan_invite(p_invite_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  UPDATE public.clan_invites SET status = 'declined'
    WHERE id = p_invite_id AND invited_user_id = v_uid AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite não encontrado'; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.cancel_clan_invite(p_invite_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_clan uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT clan_id INTO v_clan FROM public.clan_invites WHERE id = p_invite_id AND status = 'pending';
  IF v_clan IS NULL THEN RAISE EXCEPTION 'Convite não encontrado'; END IF;
  IF public.clan_role_of(v_clan, v_uid) NOT IN ('leader','vice') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.clan_invites SET status = 'cancelled' WHERE id = p_invite_id;
END; $$;

-- ============ meus convites ============
CREATE OR REPLACE FUNCTION public.my_clan_invites()
RETURNS TABLE (
  id uuid, clan_id uuid, clan_name text, clan_tag text, clan_emblem text,
  clan_league text, clan_level integer, member_count integer, max_members integer,
  invited_by_name text, expires_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, c.id, c.name, c.tag, c.emblem, c.league, c.level,
         c.member_count, c.max_members, i.invited_by_name, i.expires_at, i.created_at
  FROM public.clan_invites i
  JOIN public.clans c ON c.id = i.clan_id AND c.is_active
  WHERE i.invited_user_id = auth.uid()
    AND i.status = 'pending'
    AND i.expires_at > now()
  ORDER BY i.created_at DESC;
$$;

-- ============ convites do clã (gerenciar) ============
CREATE OR REPLACE FUNCTION public.clan_invites_list(p_clan_id uuid)
RETURNS TABLE (
  id uuid, invited_user_id uuid, invited_name text, invited_by_name text,
  invite_code text, status text, expires_at timestamptz, accepted_at timestamptz, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.invited_user_id, COALESCE(p.display_name, 'Convite por link'),
         i.invited_by_name, i.invite_code,
         CASE WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired' ELSE i.status END,
         i.expires_at, i.accepted_at, i.created_at
  FROM public.clan_invites i
  LEFT JOIN public.profiles p ON p.id = i.invited_user_id
  WHERE i.clan_id = p_clan_id
    AND public.clan_role_of(p_clan_id, auth.uid()) IN ('leader','vice')
  ORDER BY i.created_at DESC
  LIMIT 100;
$$;