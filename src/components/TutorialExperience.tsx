import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Flame, GraduationCap, Map, Shield, SkipForward, Sparkles, Star, Swords, Trophy, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type TutorialState = {
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
  goals?: string[];
  knowledge?: string;
  completed_steps?: string[];
  current_step?: number;
};

const goalsOptions = [
  '📖 Aprender mais sobre a Bíblia',
  '🎮 Aprender jogando',
  '🔥 Estudar todos os dias',
  '🏆 Competir com outros jogadores',
  '🛡️ Jogar com amigos e clãs',
];
const knowledgeOptions = ['🌱 Estou começando', '📖 Conheço um pouco', '🔥 Conheço bem', '🏆 Quero desafios difíceis'];

const lessons = [
  { key: 'welcome', icon: BookOpen, title: 'Bem-vindo ao Quiz Bíblico!', body: 'Aprenda a Bíblia jogando, evolua seu perfil e desafie outros jogadores. 📖🔥', detail: 'Vamos conhecer o essencial em poucos passos. Você pode pular agora e voltar quando quiser.' },
  { key: 'goals', icon: Sparkles, title: 'Qual é seu objetivo?', body: 'Escolha uma ou mais opções para nos ajudar a recomendar o que combina com você.', detail: 'Você poderá mudar seus hábitos a qualquer momento; nenhuma opção bloqueia funcionalidades.' },
  { key: 'knowledge', icon: GraduationCap, title: 'Quanto você conhece da Bíblia?', body: 'Escolha o nível que melhor descreve você hoje.', detail: 'Isso serve apenas como orientação inicial. Você sempre poderá jogar conteúdos mais difíceis.' },
  { key: 'quiz', icon: CheckCircle2, title: 'Sua primeira pergunta', body: 'Quem construiu a arca?', detail: 'Escolha uma resposta. Errar faz parte do aprendizado!', quiz: true },
  { key: 'xp', icon: Star, title: 'XP e níveis', body: 'XP representa seu progresso. Ao completar atividades válidas, você pode ganhar experiência e subir de nível.', detail: 'XP é progresso: não é gasto na Loja. Níveis marcam sua jornada, não garantem vantagem competitiva.' },
  { key: 'coins', icon: Sparkles, title: 'Moedas e personalização', body: 'Algumas atividades podem conceder moedas, usadas para personalizar sua experiência.', detail: 'XP = progresso. Moedas = compras cosméticas, como avatares, molduras, títulos e efeitos. Comprar é opcional.' },
  { key: 'streak', icon: Flame, title: 'Construa seu hábito', body: 'A sequência diária acompanha sua consistência de estudo.', detail: 'Volte quando puder. Se a sequência acabar, não é fracasso: você pode recomeçar a qualquer momento.' },
  { key: 'journey', icon: Map, title: 'Jornada Bíblica', body: 'Explore histórias e temas bíblicos em uma aventura progressiva.', detail: 'Comece por Criação e Patriarcas, avance por Êxodo, Reis e Profetas, e explore a vida de Jesus e a Igreja Primitiva quando disponíveis.' },
  { key: 'modes', icon: Swords, title: 'Escolha como aprender', body: 'Quiz clássico, Desafio, Batalha 1v1 e Battle Royale são maneiras diferentes de jogar.', detail: 'Experimente um modo por vez. Alguns recursos podem ter regras próprias ou disponibilidade diferente.' },
  { key: 'community', icon: Shield, title: 'Clãs, ranking e conquistas', body: 'Clãs permitem evoluir em equipe; ranking mostra posições competitivas; conquistas registram marcos.', detail: 'Convites e cargos de clã aparecem na área Clãs. A Loja e o Inventário permitem equipar personalizações adquiridas.' },
  { key: 'finish', icon: Trophy, title: 'Você está pronto!', body: 'Você está pronto para começar sua Jornada Bíblica. 📖🔥', detail: 'Escolha seu próximo passo. Você pode rever este guia pela ajuda a qualquer momento.' },
];

const storageKey = (userId: string) => `bqm_tutorial_v1_${userId}`;

export default function TutorialExperience() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<TutorialState>({});
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [contextHelp, setContextHelp] = useState(false);

  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(storageKey(user.id));
      const parsed: TutorialState = saved ? JSON.parse(saved) : {};
      setData(parsed);
      setStep(Math.min(Math.max(parsed.current_step ?? 0, 0), lessons.length - 1));
      if (location.pathname === '/' && !parsed.onboarding_completed && !parsed.onboarding_skipped) {
        setStep(Math.min(Math.max(parsed.current_step ?? 0, 0), lessons.length - 1));
        setOpen(true);
      } else {
        const contextualRoutes = ['/clans', '/shop', '/inventory', '/profile', '/battle', '/battle-royale', '/ranking', '/quiz'];
        const route = contextualRoutes.find((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
        const seenKey = `bqm_context_seen_v1_${user.id}_${route ?? ''}`;
        if (route && (parsed.onboarding_completed || parsed.onboarding_skipped) && !localStorage.getItem(seenKey)) {
          localStorage.setItem(seenKey, 'true');
          setContextHelp(true);
        }
      }
    } catch {
      setData({});
      if (location.pathname === '/') setOpen(true);
    }
  }, [user?.id, location.pathname]);

  const persist = (next: TutorialState) => {
    setData(next);
    if (user) localStorage.setItem(storageKey(user.id), JSON.stringify(next));
  };
  const current = lessons[step];
  const progress = Math.round(((step + 1) / lessons.length) * 100);

  const finish = (skipped = false) => {
    persist({ ...data, current_step: step, onboarding_completed: !skipped, onboarding_skipped: skipped, completed_steps: [...new Set([...(data.completed_steps ?? []), ...lessons.slice(0, step + 1).map((l) => l.key)])] });
    setOpen(false);
    setContextHelp(false);
  };
  const next = () => {
    persist({
      ...data,
      current_step: Math.min(step + 1, lessons.length - 1),
      completed_steps: [...new Set([...(data.completed_steps ?? []), current.key])],
    });
    if (step >= lessons.length - 1) finish(false);
    else { setStep((s) => s + 1); setAnswer(null); }
  };
  const start = () => { setStep(0); setAnswer(null); setOpen(true); setContextHelp(false); };
  const selectGoal = (goal: string) => {
    const goals = data.goals ?? [];
    persist({ ...data, goals: goals.includes(goal) ? goals.filter((g) => g !== goal) : [...goals, goal] });
  };

  const helpTitle = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith('/clan/invite/')) return 'Convites de clã';
    if (path.startsWith('/clans')) return 'Liga de Clãs';
    if (path.startsWith('/shop')) return 'Loja';
    if (path.startsWith('/inventory')) return 'Inventário';
    if (path.startsWith('/profile')) return 'Perfil';
    if (path.startsWith('/battle-royale')) return 'Battle Royale';
    if (path.startsWith('/battle')) return 'Batalha 1v1';
    if (path.startsWith('/ranking')) return 'Ranking';
    if (path.startsWith('/quiz') || path.startsWith('/challenge')) return 'Como jogar';
    return 'Guia do Jogador';
  }, [location.pathname]);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Ajuda: como funciona esta tela?"
        title="Como funciona?"
        onClick={() => setContextHelp(true)}
        className="fixed right-3 z-[60] bottom-20 sm:bottom-24 h-11 w-11 rounded-full border border-secondary/50 bg-card/95 text-secondary shadow-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CircleHelp size={22} />
      </button>

      {(open || contextHelp) && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && contextHelp) setContextHelp(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-card p-5 sm:p-7 shadow-2xl safe-area-bottom">
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-bold text-secondary">{contextHelp ? 'AJUDA RÁPIDA' : `PASSO ${step + 1} DE ${lessons.length}`}</span>
              <button type="button" onClick={() => contextHelp ? setContextHelp(false) : finish(true)} aria-label="Fechar tutorial" className="rounded-full p-2 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X size={18} /></button>
            </div>
            {!contextHelp && <div className="h-2 rounded-full bg-muted overflow-hidden mb-5" aria-label={`Progresso do tutorial: ${progress}%`}><div className="h-full bg-gradient-gold transition-all motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>}
            {contextHelp ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4"><CircleHelp size={28} className="text-primary-foreground" /></div>
                <h2 id="tutorial-title" className="text-xl font-extrabold text-foreground mb-2">Como funciona: {helpTitle}?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {helpTitle === 'Loja' ? 'Use moedas disponíveis para adquirir itens cosméticos. A compra é opcional.' :
                    helpTitle === 'Inventário' ? 'Veja os itens que você possui e equipe ou desequipe os itens disponíveis.' :
                    helpTitle === 'Perfil' ? 'Acompanhe seu nível, XP, moedas, sequência, estatísticas, conquistas e personalizações.' :
                    helpTitle === 'Liga de Clãs' || helpTitle === 'Convites de clã' ? 'Crie ou explore clãs, veja membros e cargos. Leia os detalhes antes de aceitar um convite.' :
                    helpTitle === 'Batalha 1v1' ? 'Enfrente outro jogador conforme as regras da partida. O resultado depende do desempenho da partida.' :
                    helpTitle === 'Battle Royale' ? 'Confira as regras e disponibilidade antes de entrar; o objetivo é permanecer na disputa.' :
                    helpTitle === 'Ranking' ? 'Consulte as classificações disponíveis. Ranking competitivo e nível pessoal são coisas diferentes.' :
                    'Responda às perguntas para aprender. Leia a explicação quando disponível e avance no seu ritmo. XP representa progresso; moedas servem para personalização.'}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setContextHelp(false); navigate('/help'); }} className="flex-1 rounded-xl bg-muted px-4 py-3 text-sm font-bold text-foreground">Abrir Guia completo</button>
                  <button type="button" onClick={() => setContextHelp(false)} className="flex-1 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground">Entendi</button>
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center mb-4"><current.icon size={28} className="text-secondary-foreground" /></div>
                <h2 id="tutorial-title" className="text-xl sm:text-2xl font-extrabold text-foreground mb-2">{current.title}</h2>
                <p className="text-sm text-foreground leading-relaxed mb-3">{current.body}</p>
                {current.key === 'quiz' && (
                  <div className="space-y-2 mb-4">
                    {['Abraão', 'Moisés', 'Noé', 'Davi'].map((option, i) => (
                      <button key={option} type="button" onClick={() => setAnswer(i)} disabled={answer !== null} className={`w-full rounded-xl border p-3 text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${answer === i ? (i === 2 ? 'border-emerald-500 bg-emerald-500/10 text-foreground' : 'border-destructive bg-destructive/10 text-foreground') : answer !== null && i === 2 ? 'border-emerald-500 bg-emerald-500/10 text-foreground' : 'border-border bg-muted/40 text-foreground'}`}>
                        {String.fromCharCode(65 + i)}) {option} {answer !== null && i === 2 ? '✓' : ''}
                      </button>
                    ))}
                    {answer !== null && <p role="status" className="rounded-xl bg-muted p-3 text-sm text-foreground">{answer === 2 ? '🎉 Muito bem! Noé construiu a arca (Gênesis 6–8).' : 'A resposta correta é Noé. Leia Gênesis 6–8 para conhecer a história.'}</p>}
                  </div>
                )}
                {current.key === 'goals' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">{goalsOptions.map((goal) => <button key={goal} type="button" aria-pressed={(data.goals ?? []).includes(goal)} onClick={() => selectGoal(goal)} className={`rounded-xl border p-3 text-left text-sm font-semibold ${(data.goals ?? []).includes(goal) ? 'border-secondary bg-secondary/10 text-foreground' : 'border-border bg-muted/30 text-foreground'}`}>{goal}</button>)}</div>}
                {current.key === 'knowledge' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">{knowledgeOptions.map((option) => <button key={option} type="button" aria-pressed={data.knowledge === option} onClick={() => persist({ ...data, knowledge: option })} className={`rounded-xl border p-3 text-left text-sm font-semibold ${data.knowledge === option ? 'border-secondary bg-secondary/10 text-foreground' : 'border-border bg-muted/30 text-foreground'}`}>{option}</button>)}</div>}
                <p className="text-xs text-muted-foreground leading-relaxed mb-5">{current.detail}</p>
                {current.key === 'finish' && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  <button type="button" onClick={() => { finish(false); navigate('/reading-plan'); }} className="rounded-xl border border-border p-3 text-sm font-bold text-foreground">🗺️ Começar Jornada</button>
                  <button type="button" onClick={() => { finish(false); navigate('/quiz'); }} className="rounded-xl border border-border p-3 text-sm font-bold text-foreground">🎮 Jogar Quiz</button>
                  <button type="button" onClick={() => { finish(false); navigate('/clans'); }} className="rounded-xl border border-border p-3 text-sm font-bold text-foreground">🛡️ Conhecer Clãs</button>
                  <button type="button" onClick={() => { finish(false); navigate('/shop'); }} className="rounded-xl border border-border p-3 text-sm font-bold text-foreground">🛍️ Abrir Loja</button>
                  <button type="button" onClick={() => { finish(false); navigate('/profile'); }} className="sm:col-span-2 rounded-xl bg-muted p-3 text-sm font-bold text-foreground">👤 Personalizar Perfil</button>
                </div>}
                <div className="flex items-center gap-2">
                  <button type="button" disabled={step === 0} onClick={() => { setStep((s) => Math.max(0, s - 1)); setAnswer(null); }} className="rounded-xl border border-border px-3 py-3 text-sm font-bold text-foreground disabled:opacity-40"><ChevronLeft size={16} className="inline" /> Voltar</button>
                  <button type="button" onClick={next} disabled={current.key === 'quiz' && answer === null} className="flex-1 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-40">{step === lessons.length - 1 ? 'Concluir' : 'Próximo'} <ChevronRight size={16} className="inline" /></button>
                  <button type="button" onClick={() => finish(true)} className="rounded-xl px-2 py-3 text-xs font-semibold text-muted-foreground"><SkipForward size={15} className="inline" /> Pular</button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
