import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Invite {
  id: string; clan_name: string; clan_tag: string; invited_by_name: string;
  invited_name: string; status: string; created_at: string; expires_at: string;
}

const LABEL: Record<string, string> = {
  pending: 'Pendente', accepted: 'Aceito', declined: 'Recusado', expired: 'Expirado', cancelled: 'Cancelado',
};

export default function InvitesTab() {
  const [items, setItems] = useState<Invite[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('admin_list_invites', { p_status: status, p_limit: 200 });
    if (error) toast.error('Erro ao carregar convites');
    setItems((data as Invite[]) ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const spam = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.invited_by_name] = (acc[i.invited_by_name] ?? 0) + 1;
    return acc;
  }, {});
  const topSpam = Object.entries(spam).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Convites de Clã</h2>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {topSpam.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
          Quem mais convidou no período listado: {topSpam.map(([n, c]) => `${n} (${c})`).join(' • ')}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3">Clã</th>
              <th className="p-3">Convidou</th>
              <th className="p-3">Convidado</th>
              <th className="p-3">Situação</th>
              <th className="p-3 hidden md:table-cell">Criado em</th>
              <th className="p-3 hidden md:table-cell">Expira em</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 text-foreground">{i.clan_name} <span className="text-muted-foreground">[{i.clan_tag}]</span></td>
                <td className="p-3 text-muted-foreground">{i.invited_by_name}</td>
                <td className="p-3 text-muted-foreground">{i.invited_name}</td>
                <td className="p-3"><Badge variant={i.status === 'pending' ? 'outline' : 'secondary'}>{LABEL[i.status] ?? i.status}</Badge></td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(i.created_at).toLocaleString('pt-BR')}</td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{new Date(i.expires_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>}
        {!loading && items.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">Nenhum convite.</p>}
      </div>
    </div>
  );
}
