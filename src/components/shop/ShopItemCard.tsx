import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayerAvatar from '@/components/PlayerAvatar';
import { RARITY, CATEGORY_LABELS, EFFECT_CLASS, fmt, itemStatus, lockReason, type ShopItem } from '@/hooks/useShop';

export function ItemPreviewIcon({ it, size = 56 }: { it: ShopItem; size?: number }) {
  if (it.category === 'frame') return <PlayerAvatar size={size} frameStyle={it.style} fallback={it.icon} label={it.name} />;
  if (it.category === 'effect') return <PlayerAvatar size={size} effectStyle={it.style} fallback={it.icon} label={it.name} />;
  return (
    <div role="img" aria-label={it.name} className={`rounded-2xl bg-muted flex items-center justify-center ${it.category === 'effect' ? EFFECT_CLASS[it.style] : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}>
      {it.icon}
    </div>
  );
}

export default function ShopItemCard({
  it, index, level, owned, equipped, favorite, onOpen, onFavorite,
}: {
  it: ShopItem; index: number; level: number; owned: boolean; equipped: boolean; favorite: boolean;
  onOpen: () => void; onFavorite: () => void;
}) {
  const reduce = useReducedMotion();
  const r = RARITY[it.rarity];
  const lock = owned ? null : lockReason(it, level);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.03 }}
      className="glass-card p-3 flex flex-col items-center text-center relative"
    >
      <button onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? `Remover ${it.name} dos favoritos` : `Favoritar ${it.name}`}
        className="absolute top-2 right-2 p-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Heart size={16} className={favorite ? 'fill-destructive text-destructive' : 'text-muted-foreground'} />
      </button>
      <ItemPreviewIcon it={it} />
      <p className="text-xs font-bold text-foreground mt-3 leading-tight">{it.name}</p>
      <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[it.category]}</p>
      <p className={`text-[10px] font-bold uppercase mt-0.5 ${r.cls}`}>{r.dot} {r.label}</p>
      {it.event_label && <p className="text-[10px] text-secondary font-semibold">🗓️ {it.event_label}</p>}
      <p className="text-[10px] text-muted-foreground">
        {owned ? (equipped ? '✅ Equipado' : '🎒 Adquirido') : lock ?? itemStatus(it)}
      </p>
      <div className="mt-auto pt-3 w-full">
        <Button size="sm" variant={owned ? 'outline' : 'default'} className="w-full" onClick={onOpen}>
          {owned ? (equipped ? 'Ver Item' : 'Equipar') : it.purchasable ? `🪙 ${fmt(it.price)} · Ver Item` : 'Ver como desbloquear'}
        </Button>
      </div>
    </motion.div>
  );
}
