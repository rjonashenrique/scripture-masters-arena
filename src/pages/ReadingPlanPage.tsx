import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, BookOpen, Calendar, RotateCcw, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  readingPlan,
  getPlanState,
  startPlan,
  resetPlan,
  toggleDayCompleted,
  getCurrentDay,
} from '@/lib/bibleReadingPlan';

export default function ReadingPlanPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(getPlanState());
  const [viewDay, setViewDay] = useState<number | null>(null);

  const started = !!state.startDate;
  const currentDay = started ? getCurrentDay(state) : 1;
  const completedCount = state.completedDays.length;
  const progressPct = Math.round((completedCount / readingPlan.length) * 100);

  const handleStart = () => setState(startPlan());
  const handleReset = () => {
    if (confirm('Tem certeza? Seu progresso será apagado.')) {
      resetPlan();
      setState(getPlanState());
      setViewDay(null);
    }
  };
  const handleToggle = (day: number) => setState(toggleDayCompleted(day));

  const dayData = viewDay ? readingPlan.find(d => d.day === viewDay) : null;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => (viewDay ? setViewDay(null) : navigate('/bible'))}>
            <ArrowLeft size={24} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold font-display text-foreground">
              {viewDay ? `Dia ${viewDay}` : 'Bíblia em 1 Ano'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {viewDay ? 'Leitura do dia' : 'Plano de leitura diário'}
            </p>
          </div>
        </div>

        {!started && !viewDay && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center mb-4">
              <Calendar size={32} className="text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mb-2">Leia a Bíblia em 1 ano</h2>
            <p className="text-sm text-muted-foreground mb-5">
              365 dias, ~3 capítulos por dia. Comece hoje e transforme sua vida espiritual!
            </p>
            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl bg-gradient-gold text-secondary-foreground font-bold flex items-center justify-center gap-2"
            >
              <Play size={18} /> Começar plano
            </button>
          </motion.div>
        )}

        {started && !viewDay && (
          <>
            {/* Progress card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs text-muted-foreground">Seu progresso</p>
                  <p className="text-lg font-bold font-display text-gradient-gold">
                    {completedCount} / {readingPlan.length} dias
                  </p>
                </div>
                <button onClick={handleReset} className="p-2 rounded-lg glass-card">
                  <RotateCcw size={16} className="text-muted-foreground" />
                </button>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  className="h-full rounded-full bg-gradient-gold"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{progressPct}% concluído</p>
            </motion.div>

            {/* Today highlight */}
            <button
              onClick={() => setViewDay(currentDay)}
              className="w-full glass-card p-4 mb-4 flex items-center gap-3 active:scale-[0.98] transition-transform border-2 border-secondary/40"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <BookOpen size={22} className="text-primary-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs text-secondary font-bold">HOJE • Dia {currentDay}</p>
                <p className="text-sm font-semibold text-foreground">
                  {readingPlan[currentDay - 1]?.readings.map(r => `${r.book} ${r.chapter}`).join(', ')}
                </p>
              </div>
              <span className="text-muted-foreground">›</span>
            </button>

            {/* Day list */}
            <p className="text-sm font-bold text-muted-foreground mb-2">Todos os dias</p>
            <div className="grid grid-cols-5 gap-2">
              {readingPlan.map(d => {
                const done = state.completedDays.includes(d.day);
                const isToday = d.day === currentDay;
                return (
                  <button
                    key={d.day}
                    onClick={() => setViewDay(d.day)}
                    className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                      done
                        ? 'bg-gradient-gold text-secondary-foreground'
                        : isToday
                        ? 'glass-card ring-2 ring-secondary text-foreground'
                        : 'glass-card text-muted-foreground'
                    }`}
                  >
                    {done ? <Check size={14} /> : d.day}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {viewDay && dayData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card p-4 mb-4">
              <p className="text-xs text-muted-foreground mb-3">Capítulos para hoje:</p>
              <div className="space-y-2">
                {dayData.readings.map(r => (
                  <button
                    key={`${r.book}-${r.chapter}`}
                    onClick={() => navigate(`/bible?book=${encodeURIComponent(r.book)}&chapter=${r.chapter}`)}
                    className="w-full glass-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                  >
                    <BookOpen size={18} className="text-secondary" />
                    <span className="flex-1 text-left text-sm font-semibold text-foreground">
                      {r.book} {r.chapter}
                    </span>
                    <span className="text-muted-foreground">›</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleToggle(viewDay)}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
                state.completedDays.includes(viewDay)
                  ? 'glass-card text-foreground'
                  : 'bg-gradient-gold text-secondary-foreground'
              }`}
            >
              <Check size={18} />
              {state.completedDays.includes(viewDay) ? 'Desmarcar como lido' : 'Marcar como lido'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
