import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LEAGUES } from '@/hooks/useClan';
import { clanRpc, type MyClanInvite } from '@/hooks/useClanInvites';

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

export default function ClanInvitesInbox({
  invites, displayName, onRefresh, onJoined,
}: {
  invites: MyClanInvite[];
  displayName: string;
  onRefresh: () => void;
  onJoined: (clanName: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  if (invites.length === 0) return null;

  const accept = async (inv: MyClanInvite) => {
    setBusy(inv.id);
    const { error } = await clanRpc('accept_clan_invite', {
      p_token: null, p_code: null, p_display_name: displayName, p_invite_id: inv.id,
    });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    onJoined(inv.clan_name);
  };

  const decline = async (inv: MyClanInvite) => {
    setBusy(inv.id);
    const { error } = await clanRpc('decline_clan_invite', { p_invite_id: inv.id });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success('Convite recusado');
    onRefresh();
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <p className="font-bold text-foreground text-sm flex items-center gap-2">
        <Bell size={14} /> 🔔 Convites
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-bold">
          {invites.length}
        </span>
      </p>
      {invites.map((i) => (
        <div key={i.id} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-lg shrink-0">
            {i.clan_emblem}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">
              {i.clan_name} <span className="text-xs text-secondary">[{i.clan_tag}]</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {i.invited_by_name} convidou você para entrar no clã.
            </p>
            <p className="text-[11px] text-muted-foreground">
              {LEAGUES[i.clan_league]?.icon} {i.member_count}/{i.max_members} membros
            </p>
          </div>
          <div className="flex gap-1">
            <Button size="sm" disabled={busy === i.id} onClick={() => accept(i)}>
              {busy === i.id ? <Loader2 size={14} className="animate-spin" /> : 'Aceitar'}
            </Button>
            <Button size="sm" variant="outline" disabled={busy === i.id} onClick={() => decline(i)}>
              Recusar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
