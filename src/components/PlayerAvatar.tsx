import { cn } from '@/lib/utils';
import { FRAME_CLASS, EFFECT_CLASS } from '@/hooks/useShop';

export default function PlayerAvatar({
  icon, frameStyle, effectStyle, fallback, size = 80, label,
}: {
  icon?: string | null; frameStyle?: string | null; effectStyle?: string | null;
  fallback?: string | number; size?: number; label?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label ?? 'Avatar do jogador'}
      className={cn(
        'mx-auto rounded-full bg-gradient-gold flex items-center justify-center',
        frameStyle ? FRAME_CLASS[frameStyle] : !effectStyle && 'shadow-glow-gold',
        effectStyle && EFFECT_CLASS[effectStyle],
      )}
      style={{ width: size, height: size }}
    >
      <span className="font-extrabold text-secondary-foreground" style={{ fontSize: size * 0.42 }} aria-hidden>
        {icon || fallback}
      </span>
    </div>
  );
}
