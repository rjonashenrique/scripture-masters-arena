REVOKE EXECUTE ON FUNCTION public.create_clan_invite(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_clan_invite(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decline_clan_invite(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_clan_invite(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_clan_invites() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.clan_invites_list(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.search_players(text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gen_invite_code() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_clan_invite(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_clan_invite(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_clan_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_clan_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_clan_invites() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clan_invites_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_players(text, integer) TO authenticated;