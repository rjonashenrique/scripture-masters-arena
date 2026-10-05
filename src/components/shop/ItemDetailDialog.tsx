import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PlayerAvatar from '@/components/PlayerAvatar';
import { ItemPreviewIcon } from '@/components/shop/ShopItemCard';
import {
  RARITY, CATEGORY_LABELS, CLAN_BANNER_CLASS, FRAME_CLASS, fmt, itemStatus, lockReason,
  type ShopItem, type useShop,
} from '@/hooks/useShop';

type Shop = ReturnType<typeof useShop>;

export default function ItemDetailDialog({ item, shop, onClose }: { item: ShopItem | null; shop: Shop; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'view' | 'confirm' | 'short'>('view');
  const [busy, setBusy] = useState(false);
  const { wallet, itemById, clanRole } = shop;

  const close = () => { setStep('view'); onClose(); };
  if (!item) return null;

  const coins = wallet?.coins ?? 0;
  const level = wallet?.level ?? 1;
  const owned = shop.isOwned(item);
  const equipped = shop.isEquipped(item);
  const lock = owned ? null : lockReason(item, level);
  const status = itemStatus(item);
  const soldOut = status === 'Esgotado' || status === 'Evento encerrado' || status === 'Em breve';
  const clanBlocked = item.category === 'clan' && !['leader', 'vice'].includes(clanRole ?? '');
  const r = RARITY[item.rarity];

  // preview: o item aplicado no perfil atual
  const pAvatar = item.category === 'avatar' ? item.icon : itemById(wallet?.equipped_avatar)?.icon;
  const pFrame = item.category === 'frame' ? item.style : itemById(wallet?.equipped_frame)?.style;
  const pEffect = item.category === 'effect' ? item.style : itemById(wallet?.equipped_effect)?.style;
  const pTitle = item.category === 'title' ? item.name : wallet?.active_title;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const doBuy = () => run(async () => {
    const res = await shop.buy(item.id);
    if (res.ok) { toast.success('🎉 Compra realizada!'); setStep('view'); }
    else setStep('short');
  });

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        {step === 'short' ? (
          <div className="space-y-2">
            <DialogTitle>🪙 Moedas insuficientes</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-sm">
                <p>Você possui: {fmt(coins)}</p>
                <p>Necessário: {fmt(item.price)}</p>
                <p className="font-bold text-foreground">Faltam: {fmt(Math.max(0, item.price - coins))} moedas</p>
                <p className="text-xs pt-2">Ganhe moedas terminando partidas (+5), subindo de nível (+25 ou mais) e resgatando a recompensa do dia.</p>
              </div>
            </DialogDescription>
            <div className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('view')}>Voltar</Button>
              <Button className="flex-1" onClick={() => { close(); navigate('/'); }}>Ver formas de ganhar moedas</Button>
            </div>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-2 text-center">
            <DialogTitle>Comprar este item?</DialogTitle>
            <p className="text-3xl" aria-hidden>{item.icon}</p>
            <p className="font-bold text-foreground">{item.name}</p>
            <DialogDescription>Preço: 🪙 {fmt(item.price)} · Seu saldo: 🪙 {fmt(coins)}</DialogDescription>
            {item.category === 'clan' && <p className="text-xs text-muted-foreground">Pago com o seu saldo pessoal; o item fica para o clã.</p>}
            <div className="flex gap-2 pt-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep('view')}>Cancelar</Button>
              <Button className="flex-1" disabled={busy} onClick={doBuy}>Comprar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <DialogTitle className="flex items-center justify-center gap-2">
              {item.name}
              <button onClick={() => shop.toggleFavorite(item.id)} aria-pressed={shop.favorites.has(item.id)} aria-label="Favoritar">
                <Heart size={18} className={shop.favorites.has(item.id) ? 'fill-destructive text-destructive' : 'text-muted-foreground'} />
              </button>
            </DialogTitle>
            <DialogDescription>{CATEGORY_LABELS[item.category]} · <span className={r.cls}>{r.dot} {r.label}</span></DialogDescription>

            <div className="glass-card p-4">
              <p className="text-[10px] text-muted-foreground mb-2">👁️ Visualizar</p>
              {item.category === 'clan' ? (
                <div className={`rounded-xl p-4 ${item.clan_slot === 'banner' ? CLAN_BANNER_CLASS[item.style] ?? '' : ''}`}>
                  <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center text-2xl ${item.clan_slot === 'frame' ? FRAME_CLASS[item.style] ?? '' : ''}`}>🛡️</div>
                  <p className="text-xs font-bold text-foreground mt-2">Seu clã</p>
                </div>
              ) : item.category === 'badge' ? (
                <ItemPreviewIcon it={item} size={64} />
              ) : (
                <>
                  <PlayerAvatar size={72} icon={pAvatar} frameStyle={pFrame} effectStyle={pEffect} fallback={level} />
                  <p className="text-sm font-bold text-foreground mt-3">{pTitle || 'Seu nome'}</p>
                </>
              )}
            </div>

            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
            <div className="text-xs text-muted-foreground space-y-0.5">
              {item.purchasable && <p>Preço: 🪙 {fmt(item.price)}</p>}
              {item.min_level > 1 && <p>Nível mínimo: ⭐ {item.min_level}</p>}
              {item.requirement_label && <p>Requisito: {item.requirement_label}</p>}
              {item.event_label && <p>Evento: {item.event_label}{item.ends_at ? ` · até ${new Date(item.ends_at).toLocaleDateString('pt-BR')}` : ''}</p>}
              <p>Status: {owned ? 'Adquirido' : status}</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={close}>Voltar</Button>
              {owned ? (
                item.category === 'clan' && clanBlocked ? null : (
                  <Button className="flex-1" disabled={busy} onClick={() => run(() => shop.equip(item.id, !equipped))}>
                    {equipped ? 'Desequipar' : 'Equipar'}
                  </Button>
                )
              ) : lock || !item.purchasable ? (
                <Button className="flex-1" variant="secondary" disabled>{lock ?? `🔒 ${item.requirement_label || 'Conquista'}`}</Button>
              ) : clanBlocked ? (
                <Button className="flex-1" disabled>Só líder/vice</Button>
              ) : soldOut ? (
                <Button className="flex-1" disabled>{status}</Button>
              ) : (
                <Button className="flex-1" onClick={() => (coins < item.price ? setStep('short') : setStep('confirm'))}>
                  Comprar · 🪙 {fmt(item.price)}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
