import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ClanRole = 'leader' | 'vice' | 'member';

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string;
  emblem: string;
  visibility: 'public' | 'private';
  invite_code: string;
  member_count: number;
  max_members: number;
  xp: number;
  level: number;
  league: string;
  owner_id: string;
}

export interface ClanMember {
  id: string;
  user_id: string;
  display_name: string;
  role: ClanRole;
  xp_contributed: number;
  joined_at: string;
}

export interface ClanApplication {
  id: string;
  clan_id: string;
  user_id: string;
  display_name: string;
  status: string;
  created_at: string;
}

const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase.rpc as any)(name, args);

export function useClan() {
  const { user } = useAuth();
  const [clan, setClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<ClanMember[]>([]);
  const [applications, setApplications] = useState<ClanApplication[]>([]);
  const [myRole, setMyRole] = useState<ClanRole | null>(null);
  const [myApplication, setMyApplication] = useState<ClanApplication | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setClan(null);
      setMembers([]);
      setMyRole(null);
      setLoading(false);
      return;
    }

    const { data: membership } = await supabase
      .from('clan_members')
      .select('clan_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      setClan(null);
      setMembers([]);
      setApplications([]);
      setMyRole(null);
      const { data: app } = await supabase
        .from('clan_applications')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();
      setMyApplication((app as ClanApplication) ?? null);
      setLoading(false);
      return;
    }

    setMyRole(membership.role as ClanRole);
    setMyApplication(null);

    const [{ data: clanData }, { data: memberData }] = await Promise.all([
      supabase.from('clans').select('*').eq('id', membership.clan_id).maybeSingle(),
      supabase
        .from('clan_members')
        .select('*')
        .eq('clan_id', membership.clan_id)
        .order('xp_contributed', { ascending: false }),
    ]);

    setClan((clanData as Clan) ?? null);
    setMembers((memberData as ClanMember[]) ?? []);

    if (membership.role === 'leader' || membership.role === 'vice') {
      const { data: apps } = await supabase
        .from('clan_applications')
        .select('*')
        .eq('clan_id', membership.clan_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      setApplications((apps as ClanApplication[]) ?? []);
    } else {
      setApplications([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: members and applications of my clan
  useEffect(() => {
    if (!clan?.id) return;
    const channel = supabase
      .channel(`clan-${clan.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clan_members', filter: `clan_id=eq.${clan.id}` }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clan_applications', filter: `clan_id=eq.${clan.id}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clan?.id, refresh]);

  return {
    clan,
    members,
    applications,
    myRole,
    myApplication,
    loading,
    refresh,
    canManage: myRole === 'leader' || myRole === 'vice',
    isLeader: myRole === 'leader',
    rpc,
  };
}

export const LEAGUES: Record<string, { label: string; icon: string }> = {
  bronze: { label: 'Liga Bronze', icon: '🥉' },
  silver: { label: 'Liga Prata', icon: '🥈' },
  gold: { label: 'Liga Ouro', icon: '🥇' },
  diamond: { label: 'Liga Diamante', icon: '💎' },
  master: { label: 'Liga Mestre', icon: '🔥' },
  legend: { label: 'Liga Lendária', icon: '👑' },
};

export function clanLevelInfo(xp: number) {
  // Nível 1 começa em 0 XP; cada nível exige 100 * nível XP adicional.
  let level = 1;
  let remaining = xp;
  let need = 100;
  while (remaining >= need && level < 100) {
    remaining -= need;
    level += 1;
    need = 100 * level;
  }
  return { level, current: remaining, need, progress: Math.min(100, (remaining / need) * 100) };
}

export const ROLE_LABEL: Record<ClanRole, string> = {
  leader: '👑 Líder',
  vice: '🛡️ Vice-líder',
  member: '⚔️ Membro',
};
