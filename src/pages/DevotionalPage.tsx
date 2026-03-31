import { motion } from 'framer-motion';
import { ArrowLeft, Heart, BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDevotional } from '@/hooks/useBible';

export default function DevotionalPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useDevotional();

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/')}>
            <ArrowLeft size={24} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold font-display text-foreground">Devocional Diário</h1>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 size={32} className="text-secondary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Preparando seu devocional...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-destructive">Erro ao carregar devocional.</p>
            <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary font-bold">
              Tentar novamente
            </button>
          </div>
        ) : data ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Verse card */}
            <div className="glass-card p-5 border-l-4 border-secondary">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-secondary" />
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">Versículo do Dia</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed italic">
                "{data.verse?.text?.trim()}"
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-semibold">
                — {data.verse?.reference}
              </p>
            </div>

            {/* Devotional title */}
            <div className="glass-card p-5">
              <h2 className="text-lg font-bold font-display text-gradient-gold mb-4">
                {data.devotional?.titulo}
              </h2>

              {/* Reflection */}
              <div className="space-y-3">
                {data.devotional?.reflexao?.split('\n').filter(Boolean).map((p: string, i: number) => (
                  <p key={i} className="text-sm text-foreground/90 leading-relaxed">{p}</p>
                ))}
              </div>
            </div>

            {/* Prayer */}
            {data.devotional?.oracao && (
              <div className="glass-card p-5 bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-primary" />
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Oração</span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed italic">
                  {data.devotional.oracao}
                </p>
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
