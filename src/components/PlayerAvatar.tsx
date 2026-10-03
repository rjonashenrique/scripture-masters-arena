import { cn } from '@/lib/utils';
import { FRAME_CLASS } from '@/hooks/useShop';

export default function PlayerAvatar({
  icon, frameStyle, fallback, size = 80,
}: { icon?: string | null; frameStyle?: string | null; fallback?: string | number; size?: number }) {
  return (
    <div
      className={cn(
        'mx-auto rounded-full bg-gradient-gold flex items-center justify-center',
        frameStyle ? FRAME_CLASS[frameStyle] : 'shadow-glow-gold',
      )}
      style={{ width: size, height: size }}
    >
      <span className="font-extrabold text-secondary-foreground" style={{ fontSize: size * 0.42 }}>
        {icon || fallback}
      </span>
    </div>
  );
}
