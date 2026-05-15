import { motion } from 'framer-motion';
import { getStats, getLevel, ACHIEVEMENTS } from '@/lib/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Award, Target, Zap, Clock, TrendingUp, Star, LogOut, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TitleSelector from '@/components/TitleSelector';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const stats = getStats();
  const level = getLevel(stats.totalPoints);
  const accuracy = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
  const avgTime = stats.totalAnswered > 0 ? (stats.totalTimeMs / stats.totalAnswered / 1000).toFixed(1) : '0';

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Jogador';

  const statCards = [
    { icon: Target, label: 'Respondidas', value: stats.totalAnswered },
    { icon: TrendingUp, label: 'Taxa de Acertos', value: `${accuracy}%` },
    { icon: Star, label: 'Pontuação', value: stats.totalPoints },
    { icon: Zap, label: 'Melhor Sequência', value: stats.bestStreak },
    { icon: Clock, label: 'Tempo Médio', value: `${avgTime}s` },
    { icon: Award, label: 'Conquistas', value: stats.achievements.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-extrabold font-display text-foreground">Meu Perfil</h1>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut size={16} />
            <span className="ml-1 text-xs">Sair</span>
          </Button>
        </div>

        {/* Level card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 mb-6 text-center"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-gold flex items-center justify-center mb-3 shadow-glow-gold">
            <span className="text-3xl font-extrabold text-secondary-foreground">{level.level}</span>
          </div>
          <h2 className="text-xl font-bold font-display text-gradient-gold">{displayName}</h2>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <p className="text-sm text-muted-foreground mt-1">{level.name} • {stats.totalPoints} pontos</p>
          <div className="w-full h-2 rounded-full bg-muted mt-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level.progress}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full bg-gradient-gold"
            />
          </div>
        </motion.div>

        {/* Stats grid */}
        <h2 className="text-lg font-bold font-display text-foreground mb-3">Estatísticas</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-3 flex items-center gap-3"
            >
              <s.icon size={18} className="text-secondary shrink-0" />
              <div>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* By difficulty */}
        <h2 className="text-lg font-bold font-display text-foreground mb-3">Por Dificuldade</h2>
        <div className="space-y-2 mb-6">
          {[
            { label: 'Fácil', answered: stats.easyAnswered, correct: stats.easyCorrect, color: 'bg-success' },
            { label: 'Médio', answered: stats.mediumAnswered, correct: stats.mediumCorrect, color: 'bg-secondary' },
            { label: 'Difícil', answered: stats.hardAnswered, correct: stats.hardCorrect, color: 'bg-destructive' },
          ].map((d) => {
            const pct = d.answered > 0 ? Math.round((d.correct / d.answered) * 100) : 0;
            return (
              <div key={d.label} className="glass-card p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold text-foreground">{d.label}</span>
                  <span className="text-muted-foreground">{d.correct}/{d.answered} ({pct}%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
