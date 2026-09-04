create extension if not exists pgcrypto with schema extensions;

CREATE OR REPLACE FUNCTION public.create_clan_invite(p_clan_id uuid, p_invited_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  VALUES (p_clan_id, p_invited_user_id, v_uid, COALESCE(v_name,'Jogador'), encode(extensions.digest(v_token::text, 'sha256'::text), 'hex'), v_code)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('id', v_id, 'token', v_token, 'code', v_code);
END; $function$;

CREATE OR REPLACE FUNCTION public.accept_clan_invite(p_token text DEFAULT NULL::text, p_code text DEFAULT NULL::text, p_display_name text DEFAULT NULL::text, p_invite_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.clan_invites%ROWTYPE;
  v_clan public.clans%ROWTYPE;
  v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  IF p_invite_id IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites
      WHERE id = p_invite_id AND invited_user_id = v_uid FOR UPDATE;
  ELSIF p_token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites
      WHERE token_hash = encode(extensions.digest(p_token::text, 'sha256'::text), 'hex') FOR UPDATE;
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

  UPDATE public.clan_invites SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

  UPDATE public.clan_invites SET status = 'cancelled'
    WHERE invited_user_id = v_uid AND status = 'pending' AND id <> v_inv.id;

  DELETE FROM public.clan_applications WHERE user_id = v_uid AND status = 'pending';

  RETURN v_clan.id;
END; $function$;

CREATE OR REPLACE FUNCTION public.preview_clan_invite(p_token text DEFAULT NULL::text, p_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inv public.clan_invites%ROWTYPE;
  v_clan public.clans%ROWTYPE;
BEGIN
  IF p_token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites WHERE token_hash = encode(extensions.digest(p_token::text, 'sha256'::text), 'hex');
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
END; $function$;