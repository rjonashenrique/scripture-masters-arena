
-- Fix search_path on new functions
ALTER FUNCTION public.get_league_tier(integer) SET search_path = public;
ALTER FUNCTION public.accept_join_request(uuid) SET search_path = public;
ALTER FUNCTION public.reject_join_request(uuid) SET search_path = public;
ALTER FUNCTION public.delete_clan(uuid) SET search_path = public;
ALTER FUNCTION public.kick_clan_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.set_member_role(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.transfer_clan_leadership(uuid, uuid) SET search_path = public;
