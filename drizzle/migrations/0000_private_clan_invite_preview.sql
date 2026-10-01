CREATE OR REPLACE FUNCTION public.preview_clan_invite(p_token text DEFAULT NULL::text, p_code text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_inv public.clan_invites%ROWTYPE;
  v_clan public.clans%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'auth_required'); END IF;
  IF p_token IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites WHERE token_hash = encode(extensions.digest(p_token::text, 'sha256'::text), 'hex');
  ELSIF p_code IS NOT NULL THEN
    SELECT * INTO v_inv FROM public.clan_invites WHERE invite_code = upper(trim(p_code));
  END IF;
  IF NOT FOUND OR v_inv.id IS NULL THEN RETURN jsonb_build_object('valid', false, 'reason', 'not_found'); END IF;
  IF v_inv.invited_user_id IS NOT NULL AND v_inv.invited_user_id <> v_uid THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'wrong_user');
  END IF;
  SELECT * INTO v_clan FROM public.clans WHERE id = v_inv.clan_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'reason', 'clan_missing'); END IF;
  RETURN jsonb_build_object(
    'valid', (v_inv.status = 'pending' AND v_inv.expires_at > now()),
    'reason', CASE WHEN v_inv.status <> 'pending' THEN v_inv.status
      WHEN v_inv.expires_at <= now() THEN 'expired' ELSE 'ok' END,
    'invite_id', v_inv.id,
    'directed', v_inv.invited_user_id IS NOT NULL,
    'invited_by_name', v_inv.invited_by_name,
    'expires_at', v_inv.expires_at,
    'clan', jsonb_build_object(
      'id', v_clan.id, 'name', v_clan.name, 'tag', v_clan.tag, 'emblem', v_clan.emblem,
      'description', v_clan.description, 'league', v_clan.league, 'level', v_clan.level,
      'xp', v_clan.xp, 'member_count', v_clan.member_count, 'max_members', v_clan.max_members));
END; $function$;
REVOKE EXECUTE ON FUNCTION public.preview_clan_invite(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.preview_clan_invite(text, text) TO authenticated;