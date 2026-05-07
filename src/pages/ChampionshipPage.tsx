import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Crown, Medal, Clock, Star } from 'lucide-react';
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

function useCountdown(target?: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return '';
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return 'Encerrado';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${d}d ${h}h ${m}m ${s}s`;
}

export default function ChampionshipPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [champ, setChamp] = useState<Championship | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const countdown = useCountdown(champ?.end_date);

  const refreshScores = async (champId: string) => {
    const { data: s } = await supabase
      .from('championship_scores')
      .select('user_id, display_name, points, correct_answers')
      .eq('championship_id', champId)
      .order('points', { ascending: false })
      .limit(50);
    setScores(s || []);
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const nowIso = new Date().toISOString();
      const { data: list, error } = await supabase
        .from('championships')
        .select('*')
        .lte('start_date', nowIso)
        .gte('end_date', nowIso)
        .order('start_date', { ascending: false })
        .limit(1);
      if (error) console.error('championship load error', error);
      const c = list && list[0];
      if (c) {
        setChamp(c);
        await refreshScores(c.id);
        // Realtime subscription while championship is active
        channel = supabase
          .channel(`champ-${c.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'championship_scores', filter: `championship_id=eq.${c.id}` },
            () => refreshScores(c.id)
          )
          .subscribe();
      }
      setLoading(false);
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const myRank = user ? scores.findIndex((s) => s.user_id === user.id) : -1;
  const myScore = myRank >= 0 ? scores[myRank] : null;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 pb-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold font-display text-foreground">Campeonato</h1>
          <p className="text-xs text-muted-foreground">Ranking semanal com prêmios</p>
        </div>
      </div>

      {loading ? (
        <div className="px-5 text-center text-muted-foreground py-20">Carregando...</div>
      ) : !champ ? (
        <div className="px-5 text-center py-20">
          <Trophy size={48} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-foreground font-semibold">Nenhum campeonato ativo</p>
          <p className="text-sm text-muted-foreground mt-1">Volte em breve!</p>
        </div>
      ) : (
        <div className="px-5 space-y-4">
          {/* Header card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-lg font-bold font-display text-gradient-gold">{champ.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{champ.description}</p>
              </div>
              <Trophy className="text-secondary" size={28} />
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <Clock size={14} className="text-secondary" />
              <span className="text-foreground font-semibold">Termina em {countdown}</span>
            </div>
          </motion.div>

          {/* Prizes */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { pos: '1º', coins: champ.prize_coins_1st, icon: Crown, color: 'text-yellow-400' },
              { pos: '2º', coins: champ.prize_coins_2nd, icon: Medal, color: 'text-gray-300' },
              { pos: '3º', coins: champ.prize_coins_3rd, icon: Medal, color: 'text-orange-400' },
            ].map((p) => (
              <div key={p.pos} className="glass-card p-3 text-center">
                <p.icon className={`mx-auto ${p.color}`} size={22} />
                <p className="text-sm font-bold text-foreground mt-1">{p.pos}</p>
                <p className="text-xs text-secondary font-semibold flex items-center justify-center gap-1">
                  <Star size={10} /> {p.coins}
                </p>
              </div>
            ))}
          </div>

          {/* My rank */}
          {user && (
            <div className="glass-card p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sua posição</p>
                <p className="text-lg font-bold text-foreground">
                  {myRank >= 0 ? `#${myRank + 1}` : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Seus pontos</p>
                <p className="text-lg font-bold text-gradient-gold">{myScore?.points ?? 0}</p>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-foreground px-1">Ranking</h2>
            {scores.length === 0 ? (
              <div className="glass-card p-6 text-center text-sm text-muted-foreground">
                Seja o primeiro a pontuar! Jogue um quiz para entrar no ranking.
              </div>
            ) : (
              scores.map((s, i) => {
                const isMe = user?.id === s.user_id;
                return (
                  <motion.div
                    key={s.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className={`glass-card p-3 flex items-center gap-3 ${isMe ? 'ring-2 ring-secondary' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-yellow-400/20 text-yellow-400' :
                      i === 1 ? 'bg-gray-300/20 text-gray-300' :
                      i === 2 ? 'bg-orange-400/20 text-orange-400' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {s.display_name || 'Jogador'} {isMe && <span className="text-secondary">(você)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{s.correct_answers} acertos</p>
                    </div>
                    <p className="text-sm font-bold text-gradient-gold">{s.points} pts</p>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
