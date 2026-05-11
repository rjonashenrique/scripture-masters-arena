import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getStats } from '@/lib/gameStore';
import { Check, Lock } from 'lucide-react';

const lessons = [
  { id: 1, title: 'Personagens da Bíblia', category: 'Personagens da Bíblia', icon: '👤' },
  { id: 2, title: 'Milagres de Jesus', category: 'Milagres de Jesus', icon: '✨' },
  { id: 3, title: 'Antigo Testamento', category: 'Antigo Testamento', icon: '📜' },
  { id: 4, title: 'Novo Testamento', category: 'Novo Testamento', icon: '📖' },
  { id: 5, title: 'Vida de Jesus', category: 'Vida de Jesus', icon: '✝️' },
  { id: 6, title: 'Profetas', category: 'Profetas', icon: '🔮' },
  { id: 7, title: 'Conhecimento Geral', category: 'Conhecimento Geral', icon: '🧠' },
];

export default function JourneyPage() {
  const navigate = useNavigate();
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground mb-2">Jornada Bíblica</h1>
        <p className="text-sm text-muted-foreground mb-8">Complete lições para avançar!</p>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {lessons.map((lesson, i) => {
              const completed = stats.completedLessons.includes(lesson.id);
              const unlocked = i === 0 || stats.completedLessons.includes(lessons[i - 1].id);

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
                    completed ? 'bg-gradient-gold shadow-glow-gold' : unlocked ? 'bg-primary shadow-glow-blue' : 'bg-muted'
                  }`}>
                    {completed ? <Check size={20} className="text-secondary-foreground" /> : unlocked ? lesson.icon : <Lock size={16} className="text-muted-foreground" />}
                  </div>

                  {/* Card */}
                  <button
                    disabled={!unlocked}
                    onClick={() => navigate(`/quiz?mode=classic&category=${encodeURIComponent(lesson.category)}`)}
                    className={`flex-1 glass-card p-4 text-left ${!unlocked ? 'opacity-40' : 'active:scale-[0.98]'} transition-transform`}
                  >
                    <p className="font-bold font-display text-foreground text-sm">{lesson.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {completed ? 'Completado ✓' : unlocked ? 'Toque para jogar' : 'Bloqueado'}
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
