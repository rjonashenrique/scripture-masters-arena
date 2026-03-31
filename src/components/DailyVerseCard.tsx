import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDailyVerse } from '@/hooks/useBible';

export default function DailyVerseCard() {
  const navigate = useNavigate();
  const { data, isLoading } = useDailyVerse();

  if (isLoading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-3 bg-muted rounded w-24 mb-3" />
        <div className="h-3 bg-muted rounded w-full mb-2" />
        <div className="h-3 bg-muted rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/devotional')}
      className="w-full glass-card p-4 text-left border-l-4 border-secondary active:scale-[0.98] transition-transform"
    >
      <div className="flex items-center gap-2 mb-2">
        <BookOpen size={14} className="text-secondary" />
        <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Versículo do Dia</span>
      </div>
      <p className="text-xs text-foreground/90 leading-relaxed italic line-clamp-2">
        "{data.text?.trim()}"
      </p>
      <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">
        — {data.reference}
      </p>
    </motion.button>
  );
}
