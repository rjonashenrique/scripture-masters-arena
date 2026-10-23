import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const sections = [
  { title: 'Começando', items: [
    ['Como jogar', 'Escolha um modo, leia a pergunta e selecione a resposta. Veja o resultado e a explicação quando disponível. Errar faz parte do aprendizado.'],
    ['XP e níveis', 'XP representa seu progresso ao completar atividades válidas. Níveis marcam marcos da jornada e não garantem vantagem competitiva.'],
    ['Moedas', 'Algumas atividades podem conceder moedas. Elas são usadas para comprar itens cosméticos na Loja; XP não é gasto.'],
    ['Streak', 'A sequência diária acompanha sua regularidade. Se ela acabar, você pode recomeçar sem culpa.'],
  ]},
  { title: 'Aprender', items: [
    ['Quiz e Desafio', 'O Quiz tradicional permite responder no seu ritmo; no Desafio, observe o tempo disponível.'],
    ['Jornada Bíblica', 'Use o plano de leitura e os conteúdos bíblicos disponíveis para avançar progressivamente.'],
    ['Minigames', 'Experimente os modos disponíveis no app e leia as instruções específicas antes de jogar.'],
  ]},
  { title: 'Competir', items: [
    ['Batalha 1v1', 'Você enfrenta outro jogador. Confira as regras da partida e acompanhe acertos, velocidade e pontuação conforme o modo.'],
    ['Copa', 'Quando disponível, siga as regras e etapas exibidas na competição. Não entre supondo que um formato específico esteja ativo.'],
    ['Battle Royale', 'Confira o número de jogadores e as regras apresentadas na sala antes de entrar.'],
    ['Ranking', 'As classificações representam posições competitivas; seu nível pessoal é uma métrica diferente.'],
  ]},
  { title: 'Clãs', items: [
    ['Criar ou entrar', 'Na área Clãs, você pode criar um grupo ou explorar clãs públicos e solicitar entrada nos privados.'],
    ['Convites e cargos', 'Confira o nome, tag e detalhes do clã antes de aceitar. Líderes e vice-líderes têm permissões específicas.'],
    ['XP do clã e guerras', 'O XP de clã e as competições dependem das regras implementadas no aplicativo.'],
  ]},
  { title: 'Personalização', items: [
    ['Loja', 'Use moedas disponíveis para adquirir avatares, molduras, títulos, efeitos e outros itens cosméticos. Compra é opcional.'],
    ['Inventário', 'Veja os itens que você possui e use Equipar/Desequipar quando a ação estiver disponível.'],
    ['Perfil, títulos e badges', 'Acompanhe seu progresso e personalize os itens que já desbloqueou.'],
    ['Conquistas', 'As conquistas registram marcos alcançados; consulte a descrição e os critérios exibidos no app.'],
  ]},
];

export default function PlayerGuidePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState('Como jogar');
  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-8 safe-area-top">
      <div className="flex items-center gap-3 mb-5">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft size={20} /></Button>
        <div><h1 className="text-2xl font-extrabold font-display text-foreground">📚 Guia do Jogador</h1><p className="text-sm text-muted-foreground">Aprenda no seu ritmo</p></div>
      </div>
      <div className="flex justify-end mb-3"><Button variant="outline" onClick={() => { if (!user) return; localStorage.setItem(`bqm_tutorial_v1_${user.id}`, JSON.stringify({ onboarding_completed: false, onboarding_skipped: false, completed_steps: [] })); navigate('/'); }}>🔄 Refazer Tutorial</Button></div>
      <div className="glass-card p-4 mb-4 flex items-center gap-3"><BookOpen className="text-secondary shrink-0" size={24} /><p className="text-sm text-muted-foreground">Este guia explica os recursos principais sem alterar seu XP, moedas, conquistas ou clã.</p></div>
      <div className="space-y-4">
        {sections.map((section) => <section key={section.title} className="glass-card p-4">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2"><HelpCircle size={16} className="text-secondary" />{section.title}</h2>
          <div className="space-y-2">
            {section.items.map(([title, body]) => <div key={title} className="rounded-xl border border-border/60 overflow-hidden">
              <button type="button" aria-expanded={expanded === title} onClick={() => setExpanded(expanded === title ? '' : title)} className="w-full flex items-center justify-between gap-3 p-3 text-left text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {title}<ChevronDown size={16} className={expanded === title ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {expanded === title && <p className="px-3 pb-3 text-sm leading-relaxed text-muted-foreground">{body}</p>}
            </div>)}
          </div>
        </section>)}
      </div>
    </div>
  );
}
