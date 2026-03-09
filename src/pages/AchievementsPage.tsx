import { motion } from 'framer-motion';
import { ACHIEVEMENTS, getStats } from '@/lib/gameStore';
import { Lock } from 'lucide-react';

export default function AchievementsPage() {
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground mb-2">Conquistas</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {stats.achievements.length}/{ACHIEVEMENTS.length} desbloqueadas
        </p>

        <div className="space-y-3">
          {ACHIEVEMENTS.map((a, i) => {
            const unlocked = stats.achievements.includes(a.id);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card p-4 flex items-center gap-4 ${!unlocked ? 'opacity-50' : ''}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${unlocked ? 'bg-gradient-gold shadow-glow-gold' : 'bg-muted'}`}>
                  {unlocked ? a.icon : <Lock size={18} className="text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="font-bold font-display text-foreground text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                {unlocked && <span className="text-xs font-bold text-success">✓</span>}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
