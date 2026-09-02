import { useState } from 'react';
import { Mail, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { clanRpc, useClanInvitesList, type ClanInviteRow } from '@/hooks/useClanInvites';

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function ClanInvitesManager({ clanId, refreshKey }: { clanId: string; refreshKey?: number }) {
  const { rows, loading, refresh } = useClanInvitesList(clanId);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState(refreshKey);

  if (refreshKey !== lastKey) {
    setLastKey(refreshKey);
    refresh();
  }

  const cancel = async (id: string) => {
    setBusy(id);
    const { error } = await clanRpc('cancel_clan_invite', { p_invite_id: id });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success('Convite cancelado');
    refresh();
  };

  const group = (s: ClanInviteRow['status'] | 'expired') => rows.filter((r) => r.status === s);
  const pending = group('pending');
  const accepted = group('accepted');
  const expired = rows.filter((r) => r.status === 'expired' || r.status === 'cancelled' || r.status === 'declined');

  const List = ({ items, kind }: { items: ClanInviteRow[]; kind: 'pending' | 'accepted' | 'expired' }) => (
    <div className="space-y-2 mt-3">
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">Nada por aqui.</p>
      ) : (
        items.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{r.invited_name}</p>
              <p className="text-[11px] text-muted-foreground">
                Código {r.invite_code} • por {r.invited_by_name} •{' '}
                {kind === 'accepted' && r.accepted_at
                  ? `entrou em ${fmt(r.accepted_at)}`
                  : kind === 'pending'
                    ? `expira em ${fmt(r.expires_at)}`
                    : r.status === 'cancelled' ? 'cancelado' : r.status === 'declined' ? 'recusado' : 'expirado'}
              </p>
            </div>
            {kind === 'pending' && (
              <Button size="icon" variant="outline" aria-label="Cancelar convite" disabled={busy === r.id} onClick={() => cancel(r.id)}>
                {busy === r.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="glass-card p-4">
      <p className="font-bold text-foreground text-sm flex items-center gap-2 mb-3">
        <Mail size={14} /> Convites
      </p>
      <Tabs defaultValue="pending">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 text-xs">Pendentes ({pending.length})</TabsTrigger>
          <TabsTrigger value="accepted" className="flex-1 text-xs">Aceitos</TabsTrigger>
          <TabsTrigger value="expired" className="flex-1 text-xs">Expirados</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><List items={pending} kind="pending" /></TabsContent>
        <TabsContent value="accepted"><List items={accepted} kind="accepted" /></TabsContent>
        <TabsContent value="expired"><List items={expired} kind="expired" /></TabsContent>
      </Tabs>
    </div>
  );
}
