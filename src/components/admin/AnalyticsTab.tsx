import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Row { label: string; value: string }

export default function AnalyticsTab() {
  const [users, setUsers] = useState<Row[]>([]);
  const [learning, setLearning] = useState<Row[]>([]);
  const [game, setGame] = useState<Row[]>([]);
  const [clans, setClans] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d1, d7, d30] = await Promise.all([
        (supabase.rpc as any)('admin_dashboard', { p_days: 1 }),
        (supabase.rpc as any)('admin_dashboard', { p_days: 7 }),
        (supabase.rpc as any)('admin_dashboard', { p_days: 30 }),
      ]);
      const a = d1.data, b = d7.data, c = d30.data;
      if (!a) { setLoading(false); return; }

      setUsers([
        { label: 'DAU (ativos hoje)', value: String(a.active_players) },
        { label: 'WAU (7 dias)', value: String(b.active_players) },
        { label: 'MAU (30 dias)', value: String(c.active_players) },
        { label: 'Novos cadastros hoje', value: String(a.new_today) },
        { label: 'Retenção 7d (WAU/total)', value: a.total_players ? `${((b.active_players / a.total_players) * 100).toFixed(1)}%` : '0%' },
        { label: 'Jogadores punidos', value: String(a.suspended_players) },
      ]);

      const acc = (k: string) => {
        const d = a.difficulty[k];
        return d.answered ? `${((d.correct / d.answered) * 100).toFixed(1)}%` : '—';
      };
      setLearning([
        { label: 'Precisão média geral', value: a.total_answered ? `${((a.total_correct / a.total_answered) * 100).toFixed(1)}%` : '—' },
        { label: 'Precisão — fácil', value: acc('easy') },
        { label: 'Precisão — média', value: acc('medium') },
        { label: 'Precisão — difícil', value: acc('hard') },
        { label: 'Total de respostas', value: Number(a.total_answered).toLocaleString('pt-BR') },
        { label: 'Perguntas publicadas', value: String(a.total_questions) },
      ]);

      setGame([
        { label: 'Streak médio', value: String(a.avg_streak) },
        { label: 'Pontos distribuídos', value: Number(a.total_points).toLocaleString('pt-BR') },
        { label: 'Pontos médios por jogador', value: a.total_players ? Math.round(a.total_points / a.total_players).toLocaleString('pt-BR') : '0' },
        { label: 'Batalhas 1v1', value: String(a.total_battles) },
        { label: 'Salas de Battle Royale', value: String(a.total_royale) },
        { label: 'Copas realizadas', value: String(a.total_championships) },
      ]);

      setClans([
        { label: 'Clãs ativos', value: String(a.active_clans) },
        { label: 'XP total dos clãs', value: Number(a.total_xp).toLocaleString('pt-BR') },
        { label: 'XP distribuído (30d)', value: Number((c.xp_series ?? []).reduce((s: number, p: { value: number }) => s + p.value, 0)).toLocaleString('pt-BR') },
      ]);

      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground py-10 text-center">Calculando relatórios...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Analytics</h2>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="learning">Aprendizado</TabsTrigger>
          <TabsTrigger value="game">Gamificação</TabsTrigger>
          <TabsTrigger value="clans">Clãs</TabsTrigger>
        </TabsList>
        {([['users', users], ['learning', learning], ['game', game], ['clans', clans]] as const).map(([k, rows]) => (
          <TabsContent key={k} value={k} className="pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              {rows.map((r) => (
                <div key={r.label} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-2xl font-bold text-foreground">{r.value}</p>
                  <p className="text-[11px] text-muted-foreground">{r.label}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
