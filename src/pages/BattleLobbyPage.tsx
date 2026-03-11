import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Swords, Copy, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateBattleCode, selectBattleQuestions } from '@/lib/battleUtils';
import { toast } from 'sonner';

export default function BattleLobbyPage() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(localStorage.getItem('bqm_name') || '');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = async () => {
    if (!playerName.trim()) {
      toast.error('Digite seu nome!');
      return;
    }
    setLoading(true);
    localStorage.setItem('bqm_name', playerName.trim());

    const code = generateBattleCode();
    const questionIds = selectBattleQuestions(10);

    const { data, error } = await supabase.from('battles').insert({
      code,
      player1_name: playerName.trim(),
      question_ids: questionIds,
      status: 'waiting',
    }).select().single();

    if (error || !data) {
      toast.error('Erro ao criar batalha');
      setLoading(false);
      return;
    }

    navigate(`/battle/${data.id}?player=1`);
  };

  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast.error('Digite seu nome!');
      return;
    }
    if (!joinCode.trim()) {
      toast.error('Digite o código da batalha!');
      return;
    }
    setLoading(true);
    localStorage.setItem('bqm_name', playerName.trim());

    const { data, error } = await supabase
      .from('battles')
      .select()
      .eq('code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (error || !data) {
      toast.error('Batalha não encontrada ou já iniciada');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('battles')
      .update({ player2_name: playerName.trim(), status: 'playing' })
      .eq('id', data.id);

    if (updateError) {
      toast.error('Erro ao entrar na batalha');
      setLoading(false);
      return;
    }

    navigate(`/battle/${data.id}?player=2`);
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <button onClick={() => mode === 'menu' ? navigate('/') : setMode('menu')} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow-blue">
            <Swords size={36} className="text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold font-display text-foreground">Batalha 1v1</h1>
          <p className="text-sm text-muted-foreground mt-1">Desafie um amigo em tempo real!</p>
        </div>

        {/* Name input (always visible) */}
        <div className="glass-card p-4 mb-4">
          <label className="text-xs font-semibold text-muted-foreground mb-2 block">Seu nome</label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Digite seu nome..."
            maxLength={20}
            className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {mode === 'menu' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <button
              onClick={() => setMode('create')}
              className="w-full glass-card p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
                <Swords size={24} className="text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold font-display text-foreground">Criar Batalha</p>
                <p className="text-xs text-muted-foreground">Crie uma sala e compartilhe o código</p>
              </div>
              <span className="text-muted-foreground">›</span>
            </button>

            <button
              onClick={() => setMode('join')}
              className="w-full glass-card p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
                <Users size={24} className="text-secondary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold font-display text-foreground">Entrar na Batalha</p>
                <p className="text-xs text-muted-foreground">Use o código do seu amigo</p>
              </div>
              <span className="text-muted-foreground">›</span>
            </button>
          </motion.div>
        )}

        {mode === 'create' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Swords size={20} />}
              {loading ? 'Criando...' : 'Criar Sala'}
            </button>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="glass-card p-4">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">Código da batalha</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="EX: ABC123"
                maxLength={6}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm text-center tracking-[0.3em] font-bold placeholder:text-muted-foreground placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-secondary"
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-gold text-secondary-foreground font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
              {loading ? 'Entrando...' : 'Entrar na Batalha'}
            </button>
          </motion.div>
        )}

        {/* Rules */}
        <div className="glass-card p-4 mt-6">
          <h3 className="font-bold font-display text-foreground mb-3 text-sm">Como funciona</h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-secondary">⚔️</span> 10 perguntas iguais para ambos</li>
            <li className="flex items-start gap-2"><span className="text-secondary">⏱️</span> 15 segundos por pergunta</li>
            <li className="flex items-start gap-2"><span className="text-secondary">🏆</span> Quem acertar mais vence!</li>
            <li className="flex items-start gap-2"><span className="text-secondary">📊</span> Placar em tempo real</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
