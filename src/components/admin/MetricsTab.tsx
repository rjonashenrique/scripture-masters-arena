import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, HelpCircle, CheckCircle, Star, Coins, Swords, Trophy, Activity } from 'lucide-react';

interface Metrics {
  total_players: number;
  total_questions: number;
  total_answered: number;
  total_correct: number;
  total_points: number;
  total_coins: number;
  total_battles: number;
  total_championships: number;
  total_tournaments: number;
  active_players_7d: number;
}

export default function MetricsTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.rpc as any)('get_admin_metrics');
      setMetrics(data as Metrics);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando métricas...</p>;
  if (!metrics) return <p className="text-sm text-muted-foreground py-8 text-center">Não foi possível carregar.</p>;

  const cards = [
    { icon: Users, label: 'Jogadores', value: metrics.total_players, color: 'text-primary' },
    { icon: Activity, label: 'Ativos (7d)', value: metrics.active_players_7d, color: 'text-success' },
    { icon: HelpCircle, label: 'Perguntas', value: metrics.total_questions, color: 'text-secondary' },
    { icon: CheckCircle, label: 'Respostas', value: metrics.total_answered, color: 'text-primary' },
    { icon: Star, label: 'Pontos totais', value: metrics.total_points, color: 'text-secondary' },
    { icon: Coins, label: 'Moedas totais', value: metrics.total_coins, color: 'text-secondary' },
    { icon: Swords, label: 'Batalhas', value: metrics.total_battles, color: 'text-destructive' },
    { icon: Trophy, label: 'Campeonatos', value: metrics.total_championships, color: 'text-secondary' },
    { icon: Trophy, label: 'Torneios', value: metrics.total_tournaments, color: 'text-primary' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="glass-card p-4 flex items-center gap-3">
          <c.icon size={20} className={`${c.color} shrink-0`} />
          <div>
            <p className="text-xl font-bold text-foreground">{c.value.toLocaleString('pt-BR')}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
