import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { onLevelUp, type XpAward } from '@/hooks/usePlayerLevel';

const CONFETTI = ['✨', '⭐', '🎉', '✝️', '🌟'];

export default function LevelUpModal() {
  const [award, setAward] = useState<XpAward | null>(null);
  const navigate = useNavigate();

  useEffect(() => onLevelUp((a) => {
    setAward(a);
    if ('vibrate' in navigator) navigator.vibrate?.([60, 40, 120]);
  }), []);

  return (
    <Dialog open={!!award} onOpenChange={(o) => !o && setAward(null)}>
      <DialogContent className="max-w-sm overflow-hidden text-center">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute text-lg"
            style={{ left: `${(i * 37) % 100}%`, top: -20 }}
            initial={{ y: -20, opacity: 1, rotate: 0 }}
            animate={{ y: 420, opacity: 0, rotate: 360 }}
            transition={{ duration: 2 + (i % 4) * 0.4, delay: (i % 5) * 0.12 }}
          >
            {CONFETTI[i % CONFETTI.length]}
          </motion.span>
        ))}
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
          <DialogTitle className="text-2xl font-extrabold font-display">🎉 NOVO NÍVEL!</DialogTitle>
          <div className="w-24 h-24 mx-auto my-4 rounded-full bg-gradient-gold flex items-center justify-center shadow-glow-gold">
            <span className="text-4xl font-extrabold text-secondary-foreground">{award?.new_level}</span>
          </div>
          <p className="font-bold text-foreground">⭐ Nível {award?.new_level} alcançado</p>
          {award?.info?.name && <p className="text-sm text-gradient-gold font-bold">{award.info.name}</p>}
          <p className="text-sm text-muted-foreground mt-2">Você está crescendo no conhecimento da Palavra!</p>
          <div className="glass-card p-3 mt-4 space-y-1 text-sm">
            <p className="text-xs text-muted-foreground">Recompensas</p>
            {!!award?.coins && <p className="font-semibold text-foreground">+{award.coins} moedas 🪙</p>}
            {award?.new_titles?.map((t) => (
              <p key={t} className="font-semibold text-foreground">Novo título: {t}</p>
            ))}
          </div>
          <Button className="w-full h-12 font-bold mt-5" onClick={() => setAward(null)}>Continuar</Button>
          <Button variant="outline" className="w-full mt-2" onClick={() => { setAward(null); navigate('/inventory'); }}>Ver recompensas</Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
