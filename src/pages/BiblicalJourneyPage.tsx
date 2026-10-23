import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Check, CheckCircle2, ChevronRight, Circle, LockKeyhole, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { biblicalJourney, type JourneyQuestion } from '@/data/biblicalJourney';

type JourneyProgress = {
  completedChapters: number[];
  missedQuestionIds: string[];
  lastStudyDate: string;
  streakDays: number;
};

const emptyProgress = (): JourneyProgress => ({
  completedChapters: [],
  missedQuestionIds: [],
  lastStudyDate: '',
  streakDays: 0,
});

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function storageKey(userId: string) {
  return `bqm_biblical_journey_v1_${userId}`;
}

export default function BiblicalJourneyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState<JourneyProgress>(emptyProgress);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [finishedLesson, setFinishedLesson] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const currentChapter = biblicalJourney.find((chapter) => chapter.id === activeChapter) ?? null;
  const lessonQuestions = useMemo(() => {
    if (reviewMode) {
      const missed = new Set(progress.missedQuestionIds);
      return biblicalJourney.flatMap((chapter) => chapter.questions).filter((q) => missed.has(q.id));
    }
    return currentChapter?.questions ?? [];
  }, [currentChapter, progress.missedQuestionIds, reviewMode]);
  const currentQuestion = lessonQuestions[questionIndex] ?? null;
  const correctCount = lessonQuestions.reduce((total, q) => total + (answers[q.id] === q.answer ? 1 : 0), 0);
  const completedCount = progress.completedChapters.length;
  const percent = Math.round((completedCount / biblicalJourney.length) * 100);
  const unlockedThrough = Math.min(biblicalJourney.length, completedCount + 1);

  const loadProgress = useCallback(() => {
    setLoading(true);
    setStorageError(false);
    try {
      const raw = user ? localStorage.getItem(storageKey(user.id)) : null;
      if (!raw) {
        setProgress(emptyProgress());
      } else {
        const parsed = JSON.parse(raw) as Partial<JourneyProgress>;
        setProgress({
          completedChapters: Array.isArray(parsed.completedChapters) ? parsed.completedChapters.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= biblicalJourney.length) : [],
          missedQuestionIds: Array.isArray(parsed.missedQuestionIds) ? parsed.missedQuestionIds.filter((id): id is string => typeof id === 'string') : [],
          lastStudyDate: typeof parsed.lastStudyDate === 'string' ? parsed.lastStudyDate : '',
          streakDays: Number.isFinite(parsed.streakDays) ? Math.max(0, Number(parsed.streakDays)) : 0,
        });
      }
    } catch {
      setStorageError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const persistProgress = (next: JourneyProgress) => {
    setProgress(next);
    try {
      if (!user) throw new Error('Entre na sua conta para salvar seu progresso.');
      localStorage.setItem(storageKey(user.id), JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
      toast.error('Não foi possível salvar neste dispositivo. Tente novamente.');
    }
  };

  const beginLesson = (chapterId: number) => {
    if (chapterId > unlockedThrough) return;
    setActiveChapter(chapterId);
    setQuestionIndex(0);
    setAnswers({});
    setFinishedLesson(false);
    setReviewMode(false);
  };

  const beginReview = () => {
    if (!progress.missedQuestionIds.length) return;
    setActiveChapter(null);
    setQuestionIndex(0);
    setAnswers({});
    setFinishedLesson(false);
    setReviewMode(true);
  };

  const chooseAnswer = (option: number) => {
    if (!currentQuestion || answers[currentQuestion.id] !== undefined) return;
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: option }));
  };

  const nextQuestion = () => {
    if (!currentQuestion || answers[currentQuestion.id] === undefined) return;
    if (questionIndex < lessonQuestions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const missedNow = lessonQuestions.filter((q) => answers[q.id] !== q.answer).map((q) => q.id);
    if (reviewMode) {
      const remainingMissed = progress.missedQuestionIds.filter((id) => missedNow.includes(id));
      persistProgress({ ...progress, missedQuestionIds: remainingMissed });
    } else if (currentChapter) {
      const completed = Array.from(new Set([...progress.completedChapters, currentChapter.id])).sort((a, b) => a - b);
      const today = todayKey();
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
      const streakDays = progress.lastStudyDate === today ? progress.streakDays : progress.lastStudyDate === yesterday ? progress.streakDays + 1 : 1;
      persistProgress({
        completedChapters: completed,
        missedQuestionIds: Array.from(new Set([...progress.missedQuestionIds.filter((id) => !lessonQuestions.some((q) => q.id === id)), ...missedNow])),
        lastStudyDate: today,
        streakDays,
      });
    }
    setFinishedLesson(true);
  };

  const exitLesson = () => {
    setActiveChapter(null);
    setQuestionIndex(0);
    setAnswers({});
    setFinishedLesson(false);
    setReviewMode(false);
  };

  if (loading) {
    return <main className="min-h-screen bg-gradient-hero flex items-center justify-center p-6" aria-live="polite">
      <div className="glass-card p-6 text-center"><div className="mx-auto mb-3 h-9 w-9 rounded-full border-2 border-secondary border-t-transparent animate-spin" /><p className="text-sm text-muted-foreground">Carregando sua Jornada Bíblica…</p></div>
    </main>;
  }

  if (storageError && !progress.lastStudyDate && progress.completedChapters.length === 0) {
    return <main className="min-h-screen bg-gradient-hero p-5 pt-12">
      <button onClick={() => navigate('/')} className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={18} /> Voltar ao início</button>
      <section className="glass-card p-6 text-center" role="alert">
        <p className="text-3xl mb-3">📖</p><h1 className="text-lg font-bold text-foreground mb-2">Não foi possível carregar o progresso</h1>
        <p className="text-sm text-muted-foreground mb-4">Tente novamente. Seu progresso anterior não será apagado por esta tentativa.</p>
        <button onClick={loadProgress} className="rounded-xl bg-gradient-primary px-5 py-3 font-bold text-primary-foreground">Tentar novamente</button>
      </section>
    </main>;
  }

  if (activeChapter !== null && currentChapter && !finishedLesson && currentQuestion) {
    const selected = answers[currentQuestion.id];
    const answered = selected !== undefined;
    return <main className="min-h-screen bg-gradient-hero pb-10">
      <div className="mx-auto max-w-md px-5 pt-10 safe-area-top">
        <div className="mb-5 flex items-center gap-3">
          <button onClick={exitLesson} aria-label="Sair da lição" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ArrowLeft size={21} /></button>
          <div className="min-w-0 flex-1"><p className="text-xs text-secondary font-semibold">CAPÍTULO {currentChapter.id} · LIÇÃO 1</p><h1 className="truncate text-lg font-extrabold text-foreground">{currentChapter.lessonTitle}</h1></div>
          <span className="text-xs font-bold text-muted-foreground">{questionIndex + 1}/{lessonQuestions.length}</span>
        </div>
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso da lição" aria-valuemin={0} aria-valuemax={lessonQuestions.length} aria-valuenow={questionIndex + (answered ? 1 : 0)}>
          <div className="h-full rounded-full bg-gradient-gold transition-all" style={{ width: `${((questionIndex + (answered ? 1 : 0)) / lessonQuestions.length) * 100}%` }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.section key={currentQuestion.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-card p-5">
            <p className="mb-3 text-xs font-semibold text-secondary">📖 PERGUNTA BÍBLICA</p>
            <h2 className="mb-5 text-lg font-bold leading-snug text-foreground">{currentQuestion.question}</h2>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => {
                const isCorrect = index === currentQuestion.answer;
                const isSelected = selected === index;
                const style = answered && isCorrect ? 'border-success bg-success/15' : answered && isSelected ? 'border-destructive bg-destructive/15' : 'border-border bg-background/30 hover:border-primary/50';
                return <button key={option} disabled={answered} onClick={() => chooseAnswer(index)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${style}`}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground">{String.fromCharCode(65 + index)}</span>
                  <span className="flex-1 text-sm font-medium text-foreground">{option}</span>
                  {answered && isCorrect && <CheckCircle2 size={19} className="text-success" />}
                  {answered && isSelected && !isCorrect && <XCircle size={19} className="text-destructive" />}
                </button>;
              })}
            </div>
            {answered && <div className="mt-4 rounded-xl border border-secondary/20 bg-secondary/5 p-3" aria-live="polite">
              <p className="mb-1 text-sm font-bold text-foreground">{selected === currentQuestion.answer ? 'Resposta correta!' : 'Vamos aprender com essa resposta'}</p>
              <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
              <button onClick={() => {
                const match = currentQuestion.reference.match(/^(.+)\s+(\d+):/);
                if (match) navigate(`/bible?book=${encodeURIComponent(match[1])}&chapter=${match[2]}`);
                else toast.error('Não foi possível abrir esta referência automaticamente.');
              }} className="mt-2 text-left text-xs font-bold text-secondary underline underline-offset-2">📜 {currentQuestion.reference} — abrir Bíblia</button>
            </div>}
            <button disabled={!answered} onClick={nextQuestion} className="mt-5 w-full rounded-xl bg-gradient-primary py-3.5 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {questionIndex === lessonQuestions.length - 1 ? 'Ver resultado' : 'Próxima pergunta'} <ChevronRight size={17} className="ml-1 inline" />
            </button>
          </motion.section>
        </AnimatePresence>
      </div>
    </main>;
  }

  if (finishedLesson) {
    return <main className="min-h-screen bg-gradient-hero p-5 pt-12">
      <section className="mx-auto max-w-md glass-card p-6 text-center">
        <div className="mb-3 text-5xl">{correctCount === lessonQuestions.length ? '🏆' : correctCount > 0 ? '⭐' : '📖'}</div>
        <h1 className="mb-2 text-2xl font-extrabold text-foreground">{reviewMode ? 'Revisão concluída!' : 'Lição concluída!'}</h1>
        <p className="mb-1 text-4xl font-black text-gradient-gold">{correctCount}/{lessonQuestions.length}</p>
        <p className="mb-5 text-sm text-muted-foreground">respostas corretas</p>
        {correctCount === lessonQuestions.length && !reviewMode && <p className="mb-5 rounded-xl bg-success/10 p-3 text-sm text-foreground">Capítulo concluído e próximo capítulo desbloqueado neste dispositivo.</p>}
        <div className="space-y-3">
          {progress.missedQuestionIds.length > 0 && <button onClick={beginReview} className="w-full rounded-xl border border-border py-3 font-bold text-foreground">Revisar respostas erradas ({progress.missedQuestionIds.length})</button>}
          <button onClick={exitLesson} className="w-full rounded-xl bg-gradient-primary py-3 font-bold text-primary-foreground">Voltar à Jornada</button>
          {!reviewMode && currentChapter && currentChapter.id < biblicalJourney.length && <button onClick={() => beginLesson(currentChapter.id + 1)} disabled={currentChapter.id + 1 > Math.min(biblicalJourney.length, progress.completedChapters.length + 1)} className="w-full rounded-xl bg-muted py-3 font-bold text-foreground disabled:opacity-50">Próximo capítulo →</button>}
        </div>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-gradient-hero pb-28">
    <div className="mx-auto max-w-md px-5 pt-10 safe-area-top">
      <header className="mb-5 flex items-center gap-3">
        <button onClick={() => navigate('/')} aria-label="Voltar ao início" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ArrowLeft size={21} /></button>
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-secondary">QUIZ BÍBLICO</p><h1 className="text-2xl font-extrabold text-foreground">Jornada Bíblica 🗺️</h1></div>
        <div className="rounded-xl glass-card px-3 py-2 text-center"><p className="text-sm font-extrabold text-foreground">{progress.streakDays} 🔥</p><p className="text-[10px] text-muted-foreground">dias</p></div>
      </header>
      <section className="glass-card mb-5 p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs text-muted-foreground">Sua caminhada</p><p className="text-lg font-extrabold text-gradient-gold">{completedCount} de {biblicalJourney.length} capítulos</p></div><Trophy className="text-secondary" size={25} /></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Progresso geral da Jornada" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-gradient-gold transition-all" style={{ width: `${percent}%` }} /></div>
        <p className="mt-2 text-right text-xs text-muted-foreground">{percent}% concluído</p>
        <button onClick={() => beginLesson(Math.min(biblicalJourney.length, completedCount + 1))} className="mt-4 w-full rounded-xl bg-gradient-primary py-3 font-bold text-primary-foreground">▶ Continuar Jornada</button>
        {progress.missedQuestionIds.length > 0 && <button onClick={beginReview} className="mt-2 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground">Revisar {progress.missedQuestionIds.length} pergunta(s) errada(s)</button>}
      </section>

      {storageError && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground" role="alert">O navegador não confirmou o salvamento. Seu progresso pode não persistir depois que esta página for fechada. <button onClick={loadProgress} className="ml-1 font-bold underline">Tentar carregar novamente</button></div>}

      <div className="relative space-y-3">
        <div aria-hidden className="absolute bottom-8 left-[27px] top-8 w-0.5 bg-border" />
        {biblicalJourney.map((chapter) => {
          const done = progress.completedChapters.includes(chapter.id);
          const unlocked = chapter.id <= unlockedThrough;
          return <motion.button key={chapter.id} whileTap={unlocked ? { scale: 0.985 } : undefined} disabled={!unlocked} onClick={() => beginLesson(chapter.id)} className={`relative flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${done ? 'border-success/40 bg-success/5' : unlocked ? 'glass-card border-secondary/30' : 'border-border bg-background/20 opacity-65'}`}>
            <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${done ? 'bg-success/15' : unlocked ? 'bg-gradient-primary' : 'bg-muted'}`}>
              {done ? <Check size={22} className="text-success" /> : unlocked ? chapter.icon : <LockKeyhole size={19} className="text-muted-foreground" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Capítulo {chapter.id} · 1 lição · {chapter.questions.length} perguntas</span>
              <span className="block text-sm font-extrabold text-foreground">{chapter.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{chapter.subtitle}</span>
              <span className={`mt-1 block text-[10px] font-bold ${done ? 'text-success' : unlocked ? 'text-secondary' : 'text-muted-foreground'}`}>{done ? 'Concluído' : unlocked ? 'Disponível para estudar' : 'Conclua o capítulo anterior para desbloquear'}</span>
            </span>
            {done ? <CheckCircle2 size={18} className="shrink-0 text-success" /> : unlocked ? <ChevronRight size={18} className="shrink-0 text-secondary" /> : <Circle size={18} className="shrink-0 text-muted-foreground" />}
          </motion.button>;
        })}
      </div>
      <div className="mt-6 rounded-xl border border-border p-3 text-xs text-muted-foreground">
        <p className="mb-1 flex items-center gap-2 font-bold text-foreground"><BookOpen size={15} /> Sobre as referências</p>
        As perguntas apontam para passagens bíblicas identificáveis. Abra a referência para conferir o contexto na Bíblia do aplicativo. O progresso desta versão é salvo por conta neste navegador; recompensas permanentes de XP/moedas e sincronização com o servidor ainda não estão ativadas.
      </div>
      {progress.completedChapters.length > 0 && <button onClick={() => { if (confirm('Deseja reiniciar a Jornada neste dispositivo? O progresso salvo localmente será apagado.')) { persistProgress(emptyProgress()); exitLesson(); } }} className="mt-4 flex w-full items-center justify-center gap-2 py-3 text-xs text-muted-foreground"><RotateCcw size={14} /> Reiniciar progresso local</button>}
    </div>
  </main>;
}
