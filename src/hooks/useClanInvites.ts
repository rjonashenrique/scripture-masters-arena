import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);

export interface MyClanInvite {
  id: string;
  clan_id: string;
  clan_name: string;
  clan_tag: string;
  clan_emblem: string;
  clan_league: string;
  clan_level: number;
  member_count: number;
  max_members: number;
  invited_by_name: string;
  expires_at: string;
  created_at: string;
}

export interface ClanInviteRow {
  id: string;
  invited_user_id: string | null;
  invited_name: string;
  invited_by_name: string;
  invite_code: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PlayerResult {
  id: string;
  display_name: string;
  avatar_url: string | null;
  total_points: number;
  in_clan: boolean;
  invited: boolean;
}

export function playerLevel(points: number) {
  return Math.max(1, Math.floor(points / 500) + 1);
}

export function inviteUrl(token: string) {
  return `${window.location.origin}/clan/invite/${token}`;
}

/** Convites recebidos pelo jogador logado. */
export function useMyClanInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<MyClanInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }
    const { data } = await rpc('my_clan_invites');
    setInvites((data as MyClanInvite[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`invites-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clan_invites', filter: `invited_user_id=eq.${user.id}` },
        () => refreshRef.current(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { invites, loading, refresh, count: invites.length };
}

/** Convites emitidos por um clã (líder/vice). */
export function useClanInvitesList(clanId?: string) {
  const [rows, setRows] = useState<ClanInviteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!clanId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await rpc('clan_invites_list', { p_clan_id: clanId });
    setRows((data as ClanInviteRow[]) ?? []);
    setLoading(false);
  }, [clanId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}

export { rpc as clanRpc };
