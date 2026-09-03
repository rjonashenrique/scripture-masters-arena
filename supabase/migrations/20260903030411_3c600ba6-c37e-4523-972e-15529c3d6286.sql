DROP FUNCTION IF EXISTS public.accept_clan_invite(text, text, text);

CREATE OR REPLACE FUNCTION public.accept_clan_invite(
  p_token text DEFAULT NULL,
  p_code text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_invite_id uuid DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  UPDATE public.clan_invites SET status = 'accepted', accepted_at = now() WHERE id = v_inv.id;

  UPDATE public.clan_invites SET status = 'cancelled'
    WHERE invited_user_id = v_uid AND status = 'pending' AND id <> v_inv.id;

  DELETE FROM public.clan_applications WHERE user_id = v_uid AND status = 'pending';

  RETURN v_clan.id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.accept_clan_invite(text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_clan_invite(text, text, text, uuid) TO authenticated;