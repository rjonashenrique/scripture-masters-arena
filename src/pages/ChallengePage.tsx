import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { getStats } from '@/lib/gameStore';

export default function ChallengePage() {
  const navigate = useNavigate();
  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground mb-2">Modo Desafio</h1>
        <p className="text-sm text-muted-foreground mb-8">10 perguntas, 10 segundos cada!</p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center mb-6"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-gold flex items-center justify-center mb-4 shadow-glow-gold animate-pulse-glow">
            <Zap size={36} className="text-secondary-foreground" />
          </div>
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Pronto para o Desafio?</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Responda rápido para ganhar pontos bônus!<br />
            Quanto mais rápido, mais pontos.
          </p>
          <button
            onClick={() => navigate('/quiz?mode=challenge')}
            className="w-full py-4 rounded-xl bg-gradient-gold text-secondary-foreground font-bold text-lg active:scale-[0.97] transition-transform"
          >
            Iniciar Desafio ⚡
          </button>
        </motion.div>

        <div className="glass-card p-4">
          <h3 className="font-bold font-display text-foreground mb-3 text-sm">Regras</h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-secondary">⚡</span> 10 perguntas aleatórias</li>
            <li className="flex items-start gap-2"><span className="text-secondary">⏱️</span> 10 segundos por pergunta</li>
            <li className="flex items-start gap-2"><span className="text-secondary">🎯</span> Pontos extras por rapidez</li>
            <li className="flex items-start gap-2"><span className="text-secondary">❌</span> Sem resposta = pergunta errada</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
