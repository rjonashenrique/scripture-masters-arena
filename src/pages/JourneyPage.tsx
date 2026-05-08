import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getStats } from '@/lib/gameStore';
import { Check, Lock, GraduationCap, Trophy, Star } from 'lucide-react';

const lessons = [
  { id: 1, title: 'Personagens da Bíblia', desc: 'Conheça figuras marcantes', category: 'Personagens da Bíblia', icon: '👤' },
  { id: 2, title: 'Milagres de Jesus', desc: 'Os atos sobrenaturais', category: 'Milagres de Jesus', icon: '✨' },
  { id: 3, title: 'Antigo Testamento', desc: 'História antes de Cristo', category: 'Antigo Testamento', icon: '📜' },
  { id: 4, title: 'Novo Testamento', desc: 'A nova aliança', category: 'Novo Testamento', icon: '📖' },
  { id: 5, title: 'Vida de Jesus', desc: 'Do nascimento à ressurreição', category: 'Vida de Jesus', icon: '✝️' },
  { id: 6, title: 'Profetas', desc: 'A voz de Deus', category: 'Profetas', icon: '🔮' },
  { id: 7, title: 'Conhecimento Geral', desc: 'Teste tudo o que aprendeu', category: 'Conhecimento Geral', icon: '🧠' },
];

export default function JourneyPage() {
  const navigate = useNavigate();
  const stats = getStats();
  const completedCount = stats.completedLessons.length;
  const progress = Math.round((completedCount / lessons.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow-gold">
            <GraduationCap size={20} className="text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold font-display text-foreground">Trilha Bíblica</h1>
            <p className="text-xs text-muted-foreground">Aprenda passo a passo ✨</p>
          </div>
        </div>

        {/* Progress card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 my-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-secondary" />
              <span className="text-sm font-bold text-foreground">Seu Progresso</span>
            </div>
            <span className="text-sm font-bold text-gradient-gold">{completedCount}/{lessons.length}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-gold"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{progress}% completo</p>
        </motion.div>

        <div className="relative mt-6">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {lessons.map((lesson, i) => {
              const completed = stats.completedLessons.includes(lesson.id);
              const unlocked = i === 0 || stats.completedLessons.includes(lessons[i - 1].id);
              const isCurrent = unlocked && !completed;

              return (
                <motion.div
                  key={lesson.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="relative flex items-center gap-4"
                >
                  {/* Node */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 text-xl ${
                    completed ? 'bg-gradient-gold shadow-glow-gold' : isCurrent ? 'bg-primary shadow-glow-blue animate-pulse' : 'bg-muted'
                  }`}>
                    {completed ? <Check size={20} className="text-secondary-foreground" /> : unlocked ? lesson.icon : <Lock size={16} className="text-muted-foreground" />}
                  </div>

                  {/* Card */}
                  <button
                    disabled={!unlocked}
                    onClick={() => navigate(`/quiz?mode=classic&category=${encodeURIComponent(lesson.category)}`)}
                    className={`flex-1 glass-card p-4 text-left ${!unlocked ? 'opacity-40' : 'active:scale-[0.98]'} ${isCurrent ? 'ring-2 ring-primary/50' : ''} transition-transform`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold font-display text-foreground text-sm">{lesson.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{lesson.desc}</p>
                      </div>
                      {completed && (
                        <div className="flex gap-0.5 shrink-0">
                          <Star size={12} className="text-secondary fill-secondary" />
                          <Star size={12} className="text-secondary fill-secondary" />
                          <Star size={12} className="text-secondary fill-secondary" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] mt-1.5 font-semibold ${
                      completed ? 'text-secondary' : isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }">
                      {completed ? '✓ Completado' : isCurrent ? '▶ Continuar lição' : unlocked ? 'Iniciar' : '🔒 Bloqueado'}
                    </p>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
