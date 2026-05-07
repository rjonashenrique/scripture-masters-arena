import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { questions, Question, Category } from '@/data/questions';
import { recordAnswer, getStats } from '@/lib/gameStore';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'classic';
  const categoryFilter = searchParams.get('category') as Category | null;
  const { syncStats } = useProfile();
  const { user } = useAuth();

  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let filtered = categoryFilter
      ? questions.filter((q) => q.category === categoryFilter)
      : [...questions];
    filtered = shuffleArray(filtered).slice(0, 10);
    setQuizQuestions(filtered);
    setQuestionStartTime(Date.now());
  }, [categoryFilter]);

  // Timer for challenge mode
  useEffect(() => {
    if (mode !== 'challenge' || showResult || finished || quizQuestions.length === 0) return;
    setTimeLeft(10);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, mode, showResult, finished, quizQuestions.length]);

  const handleTimeout = useCallback(() => {
    if (showResult || quizQuestions.length === 0) return;
    const q = quizQuestions[currentIndex];
    recordAnswer(false, q.difficulty, 10000);
    setSelected(-1);
    setShowResult(true);
  }, [currentIndex, showResult, quizQuestions]);

  const handleSelect = (optionIndex: number) => {
    if (showResult) return;
    const q = quizQuestions[currentIndex];
    const timeMs = Date.now() - questionStartTime;
    const correct = optionIndex === q.correct;

    setSelected(optionIndex);
    setShowResult(true);

    const stats = recordAnswer(correct, q.difficulty, timeMs);


    if (correct) {
      const pts = q.difficulty === 'easy' ? 10 : q.difficulty === 'medium' ? 20 : 40;
      const bonus = mode === 'challenge' ? Math.max(0, Math.floor((10000 - timeMs) / 1000)) : 0;
      setScore((s) => s + pts + bonus);
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= quizQuestions.length) {
      setFinished(true);
      // Sync stats to database
      syncStats(getStats());
      // Add points to active championship
      if (user) {
        const displayName = user.user_metadata?.display_name || 'Jogador';
        supabase.rpc('add_championship_points', {
          p_points: score,
          p_correct: correctCount,
          p_display_name: displayName,
        });
      }
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
    }
  };

  if (quizQuestions.length === 0) return null;

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="glass-card p-8 text-center w-full max-w-sm"
        >
          <div className="text-6xl mb-4">
            {correctCount >= 8 ? '🏆' : correctCount >= 5 ? '⭐' : '📖'}
          </div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">
            {mode === 'challenge' ? 'Desafio Completo!' : 'Quiz Finalizado!'}
          </h2>
          <p className="text-4xl font-extrabold text-gradient-gold mb-4">{score} pts</p>
          <p className="text-muted-foreground mb-6">
            {correctCount}/{quizQuestions.length} acertos
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setFinished(false); setCurrentIndex(0); setScore(0); setCorrectCount(0); setSelected(null); setShowResult(false); setQuizQuestions(shuffleArray(categoryFilter ? questions.filter(q => q.category === categoryFilter) : [...questions]).slice(0, 10)); setQuestionStartTime(Date.now()); }}
              className="w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold"
            >
              Jogar Novamente
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-muted text-foreground font-bold"
            >
              Voltar ao Início
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = quizQuestions[currentIndex];
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4 safe-area-top">
        <button onClick={() => navigate('/')} className="text-muted-foreground">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 mx-4">
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-gold transition-all"
              style={{ width: `${((currentIndex + 1) / quizQuestions.length) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-bold text-muted-foreground">
          {currentIndex + 1}/{quizQuestions.length}
        </span>
      </div>

      {/* Timer (challenge mode) */}
      {mode === 'challenge' && !showResult && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <Clock size={16} className={timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-secondary'} />
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timeLeft <= 3 ? 'bg-destructive' : 'bg-gradient-gold'}`}
              animate={{ width: `${(timeLeft / 10) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className={`text-sm font-bold ${timeLeft <= 3 ? 'text-destructive' : 'text-secondary'}`}>
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Question */}
      <div className="flex-1 px-5 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-2">
              <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                {q.category}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground ml-2">
                {q.difficulty === 'easy' ? '⬢ Fácil' : q.difficulty === 'medium' ? '⬢⬢ Médio' : '⬢⬢⬢ Difícil'}
              </span>
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mb-6 leading-snug">
              {q.question}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {q.options.map((option, i) => {
                let bg = 'glass-card';
                let border = '';
                if (showResult) {
                  if (i === q.correct) {
                    bg = 'bg-success/20 border-success';
                    border = 'border';
                  } else if (i === selected && i !== q.correct) {
                    bg = 'bg-destructive/20 border-destructive';
                    border = 'border';
                  }
                } else if (selected === i) {
                  bg = 'bg-primary/20 border-primary';
                  border = 'border';
                }

                return (
                  <motion.button
                    key={i}
                    whileTap={!showResult ? { scale: 0.97 } : {}}
                    onClick={() => handleSelect(i)}
                    className={`w-full p-4 rounded-xl text-left flex items-center gap-3 ${bg} ${border} transition-colors`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                      {optionLetters[i]}
                    </span>
                    <span className="text-sm font-medium text-foreground flex-1">{option}</span>
                    {showResult && i === q.correct && <CheckCircle2 size={20} className="text-success shrink-0" />}
                    {showResult && i === selected && i !== q.correct && <XCircle size={20} className="text-destructive shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 glass-card p-4"
              >
              <p className="text-xs text-muted-foreground leading-relaxed">
                  📖 {q.explanation}
                </p>
                {q.reference && (
                  <button
                    onClick={() => {
                      const ref = q.reference!;
                      const match = ref.match(/^(.+?)\s+(\d+)(?::(\d+))?/);
                      if (match) {
                        const verseParam = match[3] ? `&verse=${match[3]}` : '';
                        navigate(`/bible?book=${encodeURIComponent(match[1])}&chapter=${match[2]}${verseParam}`);
                      }
                    }}
                    className="text-[10px] text-secondary font-semibold mt-2 hover:underline flex items-center gap-1"
                  >
                    📜 {q.reference} →
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next button */}
        {showResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-4"
          >
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-base"
            >
              {currentIndex + 1 >= quizQuestions.length ? 'Ver Resultado' : 'Próxima Pergunta'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
