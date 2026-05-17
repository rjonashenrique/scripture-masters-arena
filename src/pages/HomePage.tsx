import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Trophy, Star, Flame, Swords, Skull, Heart, Book, Calendar, Crown } from 'lucide-react';
import { getStats, getLevel } from '@/lib/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useTournament } from '@/hooks/useTournament';
import DailyVerseCard from '@/components/DailyVerseCard';

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tournament, matches } = useTournament();
  const stats = getStats();
  const level = getLevel(stats.totalPoints);
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Jogador';

  // Pending match for the current user in the active round
  const myPendingMatch = tournament && user
    ? matches.find((m) =>
        m.status === 'pending' &&
        m.round === tournament.current_round &&
        ((m.player1_id === user.id && m.player1_score == null) ||
         (m.player2_id === user.id && m.player2_score == null))
      )
    : undefined;

  const modes = [
    {
      title: 'Quiz Clássico',
      desc: 'Responda no seu ritmo',
      icon: BookOpen,
      gradient: 'bg-gradient-primary',
      path: '/quiz?mode=classic',
    },
    {
      title: 'Modo Desafio',
      desc: '10 perguntas, 10s cada!',
      icon: Zap,
      gradient: 'bg-gradient-gold',
      path: '/quiz?mode=challenge',
    },
    {
      title: 'Batalha 1v1',
      desc: 'Desafie um amigo!',
      icon: Swords,
      gradient: 'bg-gradient-primary',
      path: '/battle',
    },
    {
      title: 'Battle Royale',
      desc: 'Errou? Eliminado! 10 ou 30 jogadores',
      icon: Skull,
      gradient: 'bg-gradient-to-br from-destructive to-destructive/60',
      path: '/battle-royale',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-6 safe-area-top">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold font-display text-foreground">
              Bible Quiz <span className="text-gradient-gold">Master</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Olá, {displayName}! ✝️</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 glass-card px-3 py-1.5">
              <Flame size={14} className="text-secondary" />
              <span className="text-xs font-bold text-foreground">{stats.streakDays}</span>
            </div>
            <div className="flex items-center gap-1 glass-card px-3 py-1.5">
              <Star size={14} className="text-secondary" />
              <span className="text-xs font-bold text-foreground">{stats.coins}</span>
            </div>
          </div>
        </div>

        {/* Level card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Nível {level.level}</p>
              <p className="text-lg font-bold font-display text-gradient-gold">{level.name}</p>
            </div>
            <div className="flex items-center gap-1">
              <Trophy size={16} className="text-secondary" />
              <span className="text-sm font-bold text-foreground">{stats.totalPoints} pts</span>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level.progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-gold"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {Math.round(level.progress)}% até próximo nível
          </p>
        </motion.div>
      </div>

      {/* Daily Verse */}
      <div className="px-5 mb-4">
        <DailyVerseCard />
      </div>

      {/* Bible & Devotional */}
      <div className="px-5 grid grid-cols-3 gap-3 mb-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/bible')}
          className="glass-card p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Book size={20} className="text-primary-foreground" />
          </div>
          <p className="text-xs font-bold text-foreground">Ler Bíblia</p>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate('/reading-plan')}
          className="glass-card p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Calendar size={20} className="text-primary-foreground" />
          </div>
          <p className="text-xs font-bold text-foreground">Plano 1 Ano</p>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate('/devotional')}
          className="glass-card p-4 flex flex-col items-center gap-2 active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
            <Heart size={20} className="text-secondary-foreground" />
          </div>
          <p className="text-xs font-bold text-foreground">Devocional</p>
        </motion.button>
      </div>

      {/* Tournament Card */}
      <div className="px-5 mb-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate(myPendingMatch ? `/tournament/match/${myPendingMatch.id}` : '/tournament')}
          className={`w-full glass-card p-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform border ${myPendingMatch ? 'border-secondary shadow-glow-gold' : 'border-secondary/30'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow-gold shrink-0">
            <Crown size={24} className="text-secondary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold font-display text-foreground">Torneio Semanal</p>
              {myPendingMatch && (
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> Ao vivo
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {myPendingMatch
                ? `Sua partida está esperando — jogar agora!`
                : 'Chave eliminatória • Prêmios em moedas e títulos'}
            </p>
          </div>
          <span className="text-secondary font-bold">›</span>
        </motion.button>
      </div>

      {/* Game modes */}
      <div className="px-5 space-y-4">
        <h2 className="text-lg font-bold font-display text-foreground">Modos de Jogo</h2>
        {modes.map((mode, i) => (
          <motion.button
            key={mode.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(mode.path)}
            className="w-full glass-card p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
          >
            <div className={`w-12 h-12 rounded-xl ${mode.gradient} flex items-center justify-center shadow-lg`}>
              <mode.icon size={24} className="text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-bold font-display text-foreground">{mode.title}</p>
              <p className="text-xs text-muted-foreground">{mode.desc}</p>
            </div>
            <span className="text-muted-foreground">›</span>
          </motion.button>
        ))}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 pt-4">
          {[
            { label: 'Respondidas', value: stats.totalAnswered },
            { label: 'Acertos', value: stats.totalAnswered > 0 ? `${Math.round((stats.totalCorrect / stats.totalAnswered) * 100)}%` : '0%' },
            { label: 'Melhor Seq.', value: stats.bestStreak },
          ].map((s) => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className="text-lg font-bold text-gradient-gold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <h2 className="text-lg font-bold font-display text-foreground pt-4">Categorias</h2>
        <div className="grid grid-cols-2 gap-3 pb-4">
          {['Antigo Testamento', 'Novo Testamento', 'Vida de Jesus', 'Personagens da Bíblia', 'Milagres de Jesus', 'Profetas'].map((cat) => (
            <motion.button
              key={cat}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/quiz?mode=classic&category=${encodeURIComponent(cat)}`)}
              className="glass-card p-3 text-left"
            >
              <p className="text-sm font-semibold text-foreground">{cat}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Jogar →</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
