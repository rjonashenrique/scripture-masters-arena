import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getQuestionById } from '@/lib/battleUtils';
import { Question } from '@/data/questions';
import { toast } from 'sonner';

const QUESTIONS_PER_MATCH = 5;
const SECONDS_PER_QUESTION = 15;

export default function TournamentMatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [matchInfo, setMatchInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load match + question pool
  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: m } = await supabase.from('tournament_matches').select('*').eq('id', id).single();
      if (!m) { toast.error('Partida não encontrada'); navigate('/tournament'); return; }
      if (m.player1_id !== user?.id && m.player2_id !== user?.id) {
        toast.error('Você não está nessa partida');
        navigate('/tournament');
        return;
      }
      const myScore = m.player1_id === user?.id ? m.player1_score : m.player2_score;
      if (myScore != null) {
        toast.info('Você já jogou essa partida');
        navigate('/tournament');
        return;
      }
      setMatchInfo(m);
      const { data: t } = await supabase.from('tournaments').select('question_ids').eq('id', m.tournament_id).single();
      const pool: number[] = (t?.question_ids as any) || [];
      // Deterministic per match: shuffle by match id + round
      const seed = m.id + ':' + m.round;
      const shuffled = [...pool].sort((a, b) => hash(seed + a) - hash(seed + b)).slice(0, QUESTIONS_PER_MATCH);
      const qs = shuffled.map((qid) => getQuestionById(qid)).filter(Boolean) as Question[];
      setQuestions(qs);
      setQuestionStartTime(Date.now());
    })();
  }, [id, user?.id, navigate]);

  // Timer
  useEffect(() => {
    if (showResult || finished || questions.length === 0) return;
    setTimeLeft(SECONDS_PER_QUESTION);
    const interval = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) { clearInterval(interval); handleTimeout(); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, showResult, finished, questions.length]);

  const handleTimeout = useCallback(() => {
    if (showResult) return;
    setSelected(-1);
    setShowResult(true);
  }, [showResult]);

  const handleSelect = (i: number) => {
    if (showResult) return;
    const q = questions[currentIndex];
    const correct = i === q.correct;
    const timeMs = Date.now() - questionStartTime;
    setSelected(i);
    setShowResult(true);
    if (correct) {
      const pts = q.difficulty === 'easy' ? 10 : q.difficulty === 'medium' ? 20 : 40;
      const bonus = Math.max(0, Math.floor((SECONDS_PER_QUESTION * 1000 - timeMs) / 1000));
      setScore((s) => s + pts + bonus);
      setCorrectCount((c) => c + 1);
    }
  };

  const submitScore = useCallback(async (finalScore: number) => {
    if (!id || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.rpc('submit_tournament_score', { p_match_id: id, p_score: finalScore });
    if (error) toast.error(error.message);
    else toast.success('Pontuação enviada!');
    setSubmitting(false);
  }, [id, submitting]);

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      submitScore(score);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setShowResult(false);
      setQuestionStartTime(Date.now());
    }
  };

  if (questions.length === 0 || !matchInfo) {
    return <div className="min-h-screen bg-gradient-hero flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-card p-8 text-center w-full max-w-sm">
          <div className="text-6xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">Partida Enviada!</h2>
          <p className="text-4xl font-extrabold text-gradient-gold mb-2">{score} pts</p>
          <p className="text-muted-foreground mb-6">{correctCount}/{questions.length} acertos</p>
          <p className="text-xs text-muted-foreground mb-4">O resultado será definido quando seu adversário também jogar (ou ao fim da rodada).</p>
          <button onClick={() => navigate('/tournament')} className="w-full py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold">
            Voltar ao Torneio
          </button>
        </motion.div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <div className="flex items-center justify-between px-5 pt-12 pb-4 safe-area-top">
        <button onClick={() => navigate('/tournament')} className="text-muted-foreground"><ArrowLeft size={24} /></button>
        <div className="flex-1 mx-4">
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-gold transition-all" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </div>
        <span className="text-xs font-bold text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
      </div>

      {!showResult && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <Clock size={16} className={timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-secondary'} />
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div className={`h-full rounded-full ${timeLeft <= 3 ? 'bg-destructive' : 'bg-gradient-gold'}`} animate={{ width: `${(timeLeft / SECONDS_PER_QUESTION) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
          <span className={`text-sm font-bold ${timeLeft <= 3 ? 'text-destructive' : 'text-secondary'}`}>{timeLeft}s</span>
        </div>
      )}

      <div className="flex-1 px-5 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex-1 flex flex-col">
            <div className="mb-2">
              <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-1 rounded-full">{q.category}</span>
              <span className="text-[10px] font-semibold text-muted-foreground ml-2">
                {q.difficulty === 'easy' ? '⬢ Fácil' : q.difficulty === 'medium' ? '⬢⬢ Médio' : '⬢⬢⬢ Difícil'}
              </span>
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mb-6 leading-snug">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((option, i) => {
                let bg = 'glass-card';
                let border = '';
                if (showResult) {
                  if (i === q.correct) { bg = 'bg-success/20 border-success'; border = 'border'; }
                  else if (i === selected) { bg = 'bg-destructive/20 border-destructive'; border = 'border'; }
                } else if (selected === i) { bg = 'bg-primary/20 border-primary'; border = 'border'; }
                return (
                  <motion.button key={i} whileTap={!showResult ? { scale: 0.97 } : {}} onClick={() => handleSelect(i)}
                    className={`w-full p-4 rounded-xl text-left flex items-center gap-3 ${bg} ${border} transition-colors`}>
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">{optionLetters[i]}</span>
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
            <button onClick={handleNext} className="w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-base">
              {currentIndex + 1 >= questions.length ? 'Enviar pontuação' : 'Próxima pergunta'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return h;
}
