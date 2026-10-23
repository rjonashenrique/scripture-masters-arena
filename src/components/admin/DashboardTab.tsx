import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Users, UserPlus, Activity, HelpCircle, Swords, Crown, Trophy, Shield, Flame, Star, AlertTriangle, Ban,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Point { day: string; value: number }
interface Dashboard {
  total_players: number; active_players: number; new_today: number; total_questions: number;
  total_answered: number; total_correct: number; total_battles: number; total_royale: number;
  total_championships: number; active_clans: number; avg_streak: number; total_xp: number;
  total_points: number; open_reports: number; suspended_players: number;
  signups_series: Point[]; active_series: Point[]; xp_series: Point[]; clans_series: Point[];
  modes: { name: string; value: number }[];
  difficulty: Record<string, { answered: number; correct: number }>;
}

const PERIODS = [
  { label: 'Hoje', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

function fmtDay(d: string) {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
}

const chartTooltip = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    fontSize: 12,
    color: 'hsl(var(--foreground))',
  },
};

export default function DashboardTab() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data: res, error } = await (supabase.rpc as any)('admin_dashboard', { p_days: days });
      if (!alive) return;
      if (error) {
        setErrorMessage(error.message || 'Não foi possível carregar as métricas.');
        setData(null);
      } else if (!res || typeof res !== 'object') {
        setErrorMessage('O servidor não retornou dados válidos para o dashboard.');
        setData(null);
      } else {
        setErrorMessage(null);
        setData(res as Dashboard);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [days, reloadKey]);

  if (loading && !data) return <p className="text-sm text-muted-foreground py-10 text-center" role="status">Carregando visão geral...</p>;
  if (!data) return (
    <div className="py-10 text-center space-y-3" role="alert">
      <p className="text-sm text-muted-foreground">{errorMessage ?? 'Não foi possível carregar as métricas.'}</p>
      <Button size="sm" variant="outline" onClick={() => { setErrorMessage(null); setLoading(true); setReloadKey((key) => key + 1); }}>
        Tentar novamente
      </Button>
    </div>
  );

  const accuracy = data.total_answered > 0 ? ((data.total_correct / data.total_answered) * 100).toFixed(1) : '0';

  const cards = [
    { icon: Users, label: 'Usuários totais', value: data.total_players },
    { icon: Activity, label: 'Usuários ativos', value: data.active_players },
    { icon: UserPlus, label: 'Novos hoje', value: data.new_today },
    { icon: HelpCircle, label: 'Perguntas', value: data.total_questions },
    { icon: Trophy, label: 'Respostas', value: data.total_answered },
    { icon: Swords, label: 'Batalhas 1v1', value: data.total_battles },
    { icon: Crown, label: 'Battle Royale', value: data.total_royale },
    { icon: Trophy, label: 'Copas', value: data.total_championships },
    { icon: Shield, label: 'Clãs ativos', value: data.active_clans },
    { icon: Flame, label: 'Streak médio', value: data.avg_streak },
    { icon: Star, label: 'XP distribuído', value: data.total_xp },
    { icon: AlertTriangle, label: 'Denúncias abertas', value: data.open_reports },
    { icon: Ban, label: 'Jogadores punidos', value: data.suspended_players },
  ];

  const diff = ['easy', 'medium', 'hard'].map((k) => ({
    name: k === 'easy' ? 'Fácil' : k === 'medium' ? 'Média' : 'Difícil',
    taxa: (data.difficulty?.[k]?.answered ?? 0) > 0
      ? Math.round(((data.difficulty?.[k]?.correct ?? 0) / (data.difficulty?.[k]?.answered ?? 1)) * 100)
      : 0,
  }));

  const series = (data.signups_series ?? []).map((p, i) => ({
    day: fmtDay(p.day),
    novos: p.value,
    ativos: data.active_series[i]?.value ?? 0,
    xp: data.xp_series[i]?.value ?? 0,
    clas: data.clans_series[i]?.value ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>
          <p className="text-xs text-muted-foreground">Taxa média de acerto: {accuracy}%</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button key={p.days} size="sm" variant={days === p.days ? 'default' : 'outline'} onClick={() => setDays(p.days)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <c.icon size={18} className="text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{Number(c.value).toLocaleString('pt-BR')}</p>
            <p className="text-[11px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Novos usuários por dia">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip {...chartTooltip} />
            <Area type="monotone" dataKey="novos" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Usuários ativos por dia">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip {...chartTooltip} />
            <Line type="monotone" dataKey="ativos" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="XP distribuído por dia">
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip {...chartTooltip} />
            <Bar dataKey="xp" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Crescimento de clãs">
          <AreaChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <Tooltip {...chartTooltip} />
            <Area type="monotone" dataKey="clas" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.2)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Taxa de acerto por dificuldade (%)">
          <BarChart data={diff}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
            <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
            <Tooltip {...chartTooltip} />
            <Bar dataKey="taxa" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Modos de jogo mais utilizados">
          <BarChart data={data.modes ?? []} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} fontSize={11} stroke="hsl(var(--muted-foreground))" />
            <Tooltip {...chartTooltip} />
            <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
