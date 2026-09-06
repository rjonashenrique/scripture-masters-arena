import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Report {
  id: string; reporter_name: string; target_type: string; target_label: string;
  category: string; description: string; status: string; resolution: string; created_at: string;
}

interface Suspicious {
  user_id: string; display_name: string; total_points: number; total_answered: number;
  accuracy: number; xp_today: number; risk: string;
}

const STATUS: Record<string, string> = { new: 'Novo', reviewing: 'Em análise', resolved: 'Resolvido', dismissed: 'Descartado' };
const RISK: Record<string, { label: string; cls: string }> = {
  low: { label: '🟢 Normal', cls: 'text-muted-foreground' },
  medium: { label: '🟡 Atenção', cls: 'text-secondary' },
  high: { label: '🔴 Suspeito', cls: 'text-destructive' },
};

export default function ModerationTab() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Moderação</h2>
      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Denúncias</TabsTrigger>
          <TabsTrigger value="fraud">Anti-fraude</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="pt-4"><Reports /></TabsContent>
        <TabsContent value="fraud" className="pt-4"><AntiFraud /></TabsContent>
      </Tabs>
    </div>
  );
}

function Reports() {
  const [items, setItems] = useState<Report[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = (supabase as any).from('moderation_reports').select('*').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setItems((data as Report[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, status: string) => {
    const { error } = await (supabase.rpc as any)('admin_resolve_report', {
      p_report_id: id, p_status: status, p_resolution: notes[id] ?? '',
    });
    if (error) return toast.error(error.message);
    toast.success('Denúncia atualizada');
    load();
  };

  return (
    <div className="space-y-3">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
        </SelectContent>
      </Select>

      {loading && <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>}
      {!loading && items.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma denúncia registrada.</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-foreground text-sm">{r.target_type}: {r.target_label || '—'}</p>
              <Badge variant={r.status === 'new' ? 'destructive' : 'secondary'}>{STATUS[r.status] ?? r.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Motivo: {r.category} • por {r.reporter_name || 'anônimo'} • {new Date(r.created_at).toLocaleString('pt-BR')}
            </p>
            {r.description && <p className="text-sm text-foreground">{r.description}</p>}
            {r.resolution && <p className="text-xs text-muted-foreground">Decisão: {r.resolution}</p>}
            <Textarea rows={2} placeholder="Decisão do moderador" value={notes[r.id] ?? ''}
              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => resolve(r.id, 'reviewing')}>Em análise</Button>
              <Button size="sm" onClick={() => resolve(r.id, 'resolved')}>Resolver</Button>
              <Button size="sm" variant="ghost" onClick={() => resolve(r.id, 'dismissed')}>Descartar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AntiFraud() {
  const [items, setItems] = useState<Suspicious[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.rpc as any)('admin_suspicious');
      if (error) toast.error(error.message);
      setItems((data as Suspicious[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Analisando comportamento...</p>;

  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground border-b border-border">
          <tr>
            <th className="p-3">Jogador</th>
            <th className="p-3">Risco</th>
            <th className="p-3">XP hoje</th>
            <th className="p-3">Pontos</th>
            <th className="p-3">Respostas</th>
            <th className="p-3">Acerto</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.user_id} className="border-b border-border/50 last:border-0">
              <td className="p-3 text-foreground">{s.display_name || 'Sem nome'}</td>
              <td className={`p-3 font-medium ${RISK[s.risk].cls}`}>{RISK[s.risk].label}</td>
              <td className="p-3">{s.xp_today}</td>
              <td className="p-3">{s.total_points.toLocaleString('pt-BR')}</td>
              <td className="p-3">{s.total_answered}</td>
              <td className="p-3">{s.accuracy}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum sinal registrado.</p>}
      <p className="p-3 text-[10px] text-muted-foreground border-t border-border">
        Os sinais são indicativos: nenhuma punição é aplicada automaticamente.
      </p>
    </div>
  );
}
