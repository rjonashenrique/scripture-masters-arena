import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, Flame, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RankPlayer {
  id: string;
  display_name: string;
  total_points: number;
  total_correct: number;
  total_answered: number;
  best_streak: number;
}

export default function RankingPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<RankPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRanking() {
      const { data } = await supabase.rpc('get_leaderboard', { p_limit: 50 });
      if (data) setPlayers(data as RankPlayer[]);
      setLoading(false);
    }
    fetchRanking();
  }, []);

  const myRank = players.findIndex(p => p.id === user?.id);

  const podiumIcons = [
    <Crown key="1" size={20} className="text-secondary" />,
    <Medal key="2" size={20} className="text-muted-foreground" />,
    <Medal key="3" size={20} className="text-accent-foreground" />,
  ];

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 pb-4 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground">
          Ranking <span className="text-gradient-gold">Global</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Os melhores jogadores ✝️</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          {/* Podium */}
          {players.length >= 3 && (
            <div className="px-5 mb-6">
              <div className="flex items-end justify-center gap-3">
                {/* 2nd place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex-1 glass-card p-3 text-center"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-2 text-lg font-bold text-muted-foreground">
                    2
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">{players[1].display_name || 'Jogador'}</p>
                  <p className="text-sm font-extrabold text-gradient-gold">{players[1].total_points}</p>
                  <p className="text-[10px] text-muted-foreground">pontos</p>
                </motion.div>

                {/* 1st place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex-1 glass-card p-4 text-center border-secondary/30 relative"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Crown size={24} className="text-secondary" />
                  </div>
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-gold flex items-center justify-center mb-2 text-lg font-bold text-primary-foreground">
                    1
                  </div>
                  <p className="text-sm font-bold text-foreground truncate">{players[0].display_name || 'Jogador'}</p>
                  <p className="text-lg font-extrabold text-gradient-gold">{players[0].total_points}</p>
                  <p className="text-[10px] text-muted-foreground">pontos</p>
                </motion.div>

                {/* 3rd place */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex-1 glass-card p-3 text-center"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center mb-2 text-lg font-bold text-muted-foreground">
                    3
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">{players[2].display_name || 'Jogador'}</p>
                  <p className="text-sm font-extrabold text-gradient-gold">{players[2].total_points}</p>
                  <p className="text-[10px] text-muted-foreground">pontos</p>
                </motion.div>
              </div>
            </div>
          )}

          {/* My position */}
          {myRank >= 0 && (
            <div className="px-5 mb-4">
              <div className="glass-card p-3 flex items-center gap-3 border-secondary/30">
                <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {myRank + 1}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Sua posição</p>
                  <p className="text-sm font-bold text-foreground">{players[myRank].display_name || 'Você'}</p>
                </div>
                <p className="text-sm font-extrabold text-gradient-gold">{players[myRank].total_points} pts</p>
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="px-5 space-y-2">
            {players.map((player, i) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass-card p-3 flex items-center gap-3 ${player.id === user?.id ? 'border-secondary/30' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                  {i < 3 ? podiumIcons[i] : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {player.display_name || 'Jogador'}
                    {player.id === user?.id && <span className="text-secondary text-xs ml-1">(você)</span>}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5">
                      <Target size={10} /> {player.total_answered > 0 ? Math.round((player.total_correct / player.total_answered) * 100) : 0}% acertos
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Flame size={10} /> {player.best_streak} seq.
                    </span>
                  </div>
                </div>
                <p className="text-sm font-extrabold text-gradient-gold shrink-0">{player.total_points}</p>
              </motion.div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-10">
                <Trophy size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum jogador ainda. Seja o primeiro!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
