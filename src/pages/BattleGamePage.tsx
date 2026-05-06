import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, Copy, Loader2, Swords } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getQuestionById } from '@/lib/battleUtils';
import { Question } from '@/data/questions';
import { toast } from 'sonner';

type BattleRow = {
  id: string;
  code: string;
  status: string;
  player1_name: string;
  player2_name: string | null;
  player1_score: number;
  player2_score: number;
  player1_answers: number[];
  player2_answers: number[];
  current_question: number;
  question_ids: number[];
};

export default function BattleGamePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const playerNum = searchParams.get('player') === '2' ? 2 : 1;

  const [battle, setBattle] = useState<BattleRow | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [myScore, setMyScore] = useState(0);
  const [myAnswers, setMyAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  // Fetch battle data
  useEffect(() => {
    if (!id) return;
    const fetchBattle = async () => {
      const { data } = await supabase.from('battles').select().eq('id', id).single();
      if (data) {
        setBattle({
          ...data,
          player1_answers: (data.player1_answers || []) as number[],
          player2_answers: (data.player2_answers || []) as number[],
          question_ids: (data.question_ids || []) as number[],
        });
      }
    };
    fetchBattle();
  }, [id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`battle-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'battles',
        filter: `id=eq.${id}`,
      }, (payload) => {
        const data = payload.new as any;
        setBattle({
          ...data,
          player1_answers: (data.player1_answers || []) as number[],
          player2_answers: (data.player2_answers || []) as number[],
          question_ids: (data.question_ids || []) as number[],
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Timer
  useEffect(() => {
    if (!battle || battle.status === 'waiting' || showResult || finished) return;
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentIndex, battle?.status, showResult, finished]);

  const handleTimeout = useCallback(() => {
    if (showResult) return;
    setSelected(-1);
    setShowResult(true);
    submitAnswer(-1, 0);
  }, [showResult, currentIndex]);

  const submitAnswer = async (answerIndex: number, points: number) => {
    if (!battle || !id) return;
    const newAnswers = [...myAnswers, answerIndex];
    setMyAnswers(newAnswers);
    const newScore = myScore + points;
    setMyScore(newScore);

    const updateData: Record<string, any> = {};
    if (playerNum === 1) {
      updateData.player1_answers = newAnswers;
      updateData.player1_score = newScore;
    } else {
      updateData.player2_answers = newAnswers;
      updateData.player2_score = newScore;
    }

    await supabase.from('battles').update(updateData as any).eq('id', id);
  };

  const handleSelect = (optionIndex: number) => {
    if (showResult || !battle) return;
    const questionIds = battle.question_ids;
    const q = getQuestionById(questionIds[currentIndex]);
    if (!q) return;

    const correct = optionIndex === q.correct;
    const points = correct ? (q.difficulty === 'easy' ? 10 : q.difficulty === 'medium' ? 20 : 40) : 0;

    setSelected(optionIndex);
    setShowResult(true);
    submitAnswer(optionIndex, points);
  };

  const handleNext = () => {
    if (!battle) return;
    if (currentIndex + 1 >= battle.question_ids.length) {
      setFinished(true);
      if (playerNum === 1 || playerNum === 2) {
        // Check if both finished
        const otherAnswers = playerNum === 1 ? battle.player2_answers : battle.player1_answers;
        if (otherAnswers.length >= battle.question_ids.length) {
          supabase.from('battles').update({ status: 'finished' }).eq('id', battle.id);
        }
      }
    } else {
      setCurrentIndex(i => i + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const copyCode = () => {
    if (battle) {
      navigator.clipboard.writeText(battle.code);
      toast.success('Código copiado!');
    }
  };

  // Waiting screen
  if (battle && battle.status === 'waiting' && playerNum === 1) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center w-full max-w-sm"
        >
          <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Aguardando oponente...</h2>
          <p className="text-sm text-muted-foreground mb-6">Compartilhe o código com seu amigo:</p>
          
          <button
            onClick={copyCode}
            className="flex items-center justify-center gap-3 mx-auto glass-card px-6 py-4 mb-6"
          >
            <span className="text-3xl font-extrabold tracking-[0.3em] text-gradient-gold">{battle.code}</span>
            <Copy size={20} className="text-muted-foreground" />
          </button>

          <p className="text-xs text-muted-foreground">O jogo começa automaticamente quando seu amigo entrar</p>
          
          <button
            onClick={() => navigate('/battle')}
            className="mt-6 text-sm text-muted-foreground underline"
          >
            Cancelar
          </button>
        </motion.div>
      </div>
    );
  }

  if (!battle || battle.question_ids.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  // Get opponent info
  const opponentName = playerNum === 1 ? battle.player2_name : battle.player1_name;
  const opponentScore = playerNum === 1 ? battle.player2_score : battle.player1_score;
  const opponentAnswers = playerNum === 1 ? battle.player2_answers : battle.player1_answers;

  // Finished screen
  if (finished) {
    const won = myScore > opponentScore;
    const tie = myScore === opponentScore;
    const bothFinished = opponentAnswers.length >= battle.question_ids.length;

    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="glass-card p-8 text-center w-full max-w-sm"
        >
          {!bothFinished ? (
            <>
              <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold font-display text-foreground mb-2">Aguardando oponente terminar...</h2>
              <p className="text-sm text-muted-foreground">Sua pontuação: {myScore} pts</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">{won ? '🏆' : tie ? '🤝' : '😔'}</div>
              <h2 className="text-2xl font-bold font-display text-foreground mb-2">
                {won ? 'Você Venceu!' : tie ? 'Empate!' : 'Você Perdeu!'}
              </h2>
              
              <div className="flex justify-center gap-6 my-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{playerNum === 1 ? battle.player1_name : battle.player2_name}</p>
                  <p className={`text-3xl font-extrabold ${won ? 'text-gradient-gold' : 'text-foreground'}`}>{myScore}</p>
                </div>
                <div className="flex items-center">
                  <Swords size={24} className="text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">{opponentName}</p>
                  <p className={`text-3xl font-extrabold ${!won && !tie ? 'text-gradient-gold' : 'text-foreground'}`}>{opponentScore}</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => navigate('/battle')}
                  className="w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold"
                >
                  Nova Batalha
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 rounded-xl bg-muted text-foreground font-bold"
                >
                  Voltar ao Início
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  const q = getQuestionById(battle.question_ids[currentIndex]);
  if (!q) return null;
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Score bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 safe-area-top">
        <div className="text-center flex-1">
          <p className="text-[10px] text-muted-foreground truncate">{playerNum === 1 ? battle.player1_name : battle.player2_name}</p>
          <p className="text-lg font-bold text-gradient-gold">{myScore}</p>
        </div>
        <div className="flex flex-col items-center px-4">
          <Swords size={20} className="text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground">{currentIndex + 1}/{battle.question_ids.length}</span>
        </div>
        <div className="text-center flex-1">
          <p className="text-[10px] text-muted-foreground truncate">{opponentName || '???'}</p>
          <p className="text-lg font-bold text-foreground">{opponentScore}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-2">
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-gold transition-all"
            style={{ width: `${((currentIndex + 1) / battle.question_ids.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Timer */}
      {!showResult && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <Clock size={16} className={timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-secondary'} />
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timeLeft <= 3 ? 'bg-destructive' : 'bg-gradient-gold'}`}
              animate={{ width: `${(timeLeft / 15) * 100}%` }}
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
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mb-6 leading-snug">{q.question}</h2>

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

            {showResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 glass-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">📖 {q.explanation}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {showResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-4">
            <button
              onClick={handleNext}
              className="w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-base"
            >
              {currentIndex + 1 >= battle.question_ids.length ? 'Ver Resultado' : 'Próxima Pergunta'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
