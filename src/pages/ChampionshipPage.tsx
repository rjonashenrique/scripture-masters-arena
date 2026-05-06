import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Medal, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Championship {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  prize_coins_1st: number;
  prize_coins_2nd: number;
  prize_coins_3rd: number;
}

interface Score {
  user_id: string;
  display_name: string;
  points: number;
  correct_answers: number;
}

function formatRemaining(end: string): string {
  const ms = new Date(end).getTime() - Date.now();
  if (ms <= 0) return 'Encerrado';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h restantes`;
  if (h > 0) return `${h}h ${m}min restantes`;
  return `${m}min restantes`;
}

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const nowIso = new Date().toISOString();
      const { data: champs } = await supabase
        .from('championships')
        .select('*')
        .lte('start_date', nowIso)
        .gte('end_date', nowIso)
        .order('start_date', { ascending: false })
        .limit(1);
      const champ = champs?.[0] || null;
      if (!mounted) return;
      setChampionship(champ);
      if (champ) {
        const { data: s } = await supabase
          .from('championship_scores')
          .select('user_id, display_name, points, correct_answers')
          .eq('championship_id', champ.id)
          .order('points', { ascending: false })
          .limit(50);
        if (mounted) setScores((s as Score[]) || []);
      }
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel('championship-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'championship_scores' }, () => load())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const myRank = user ? scores.findIndex((s) => s.user_id === user.id) : -1;
  const podium = scores.slice(0, 3);
  const rest = scores.slice(3);

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 pb-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold font-display text-foreground">Campeonato</h1>
          <p className="text-xs text-muted-foreground">Ranking ao vivo</p>
        </div>
      </div>

      {loading ? (
        <div className="px-5 text-center text-muted-foreground text-sm mt-10">Carregando...</div>
      ) : !championship ? (
        <div className="px-5 mt-10 text-center">
          <Trophy size={48} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum campeonato ativo no momento.</p>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          {/* Championship info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1">
                <p className="text-lg font-bold font-display text-gradient-gold">{championship.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{championship.description}</p>
              </div>
              <Trophy size={28} className="text-secondary shrink-0" />
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-secondary">
              <Clock size={14} />
              <span className="font-semibold">{formatRemaining(championship.end_date)}</span>
            </div>
          </motion.div>

          {/* Prizes */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { place: '1º', coins: championship.prize_coins_1st, color: 'text-yellow-400' },
              { place: '2º', coins: championship.prize_coins_2nd, color: 'text-gray-300' },
              { place: '3º', coins: championship.prize_coins_3rd, color: 'text-amber-600' },
            ].map((p) => (
              <div key={p.place} className="glass-card p-3 text-center">
                <Medal className={`mx-auto mb-1 ${p.color}`} size={20} />
                <p className="text-xs font-bold text-foreground">{p.place} lugar</p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Coins size={12} className="text-secondary" />
                  <span className="text-xs font-bold text-gradient-gold">{p.coins}</span>
                </div>
              </div>
            ))}
          </div>

          {/* My rank */}
          {user && (
            <div className="glass-card p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sua posição</p>
                <p className="text-lg font-bold text-foreground">
                  {myRank >= 0 ? `#${myRank + 1}` : 'Sem pontos ainda'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Pontos</p>
                <p className="text-lg font-bold text-gradient-gold">
                  {myRank >= 0 ? scores[myRank].points : 0}
                </p>
              </div>
            </div>
          )}

          {/* Podium */}
          {podium.length > 0 && (
            <div className="glass-card p-4">
              <h2 className="text-sm font-bold font-display text-foreground mb-3">🏆 Pódio</h2>
              <div className="space-y-2">
                {podium.map((s, i) => (
                  <div
                    key={s.user_id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      user?.id === s.user_id ? 'bg-secondary/20' : 'bg-muted/30'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-yellow-400 text-yellow-950' :
                      i === 1 ? 'bg-gray-300 text-gray-900' :
                      'bg-amber-600 text-amber-50'
                    }`}>
                      {i + 1}
                    </div>
                    <p className="flex-1 text-sm font-semibold text-foreground truncate">{s.display_name || 'Jogador'}</p>
                    <p className="text-sm font-bold text-gradient-gold">{s.points} pts</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rest of ranking */}
          {rest.length > 0 && (
            <div className="glass-card p-4">
              <h2 className="text-sm font-bold font-display text-foreground mb-3">Classificação</h2>
              <div className="space-y-1">
                {rest.map((s, i) => (
                  <div
                    key={s.user_id}
                    className={`flex items-center gap-3 px-2 py-1.5 rounded ${
                      user?.id === s.user_id ? 'bg-secondary/20' : ''
                    }`}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6">#{i + 4}</span>
                    <p className="flex-1 text-sm text-foreground truncate">{s.display_name || 'Jogador'}</p>
                    <p className="text-sm font-semibold text-foreground">{s.points}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scores.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-6">
              Seja o primeiro a pontuar! Jogue um quiz para entrar no ranking.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
