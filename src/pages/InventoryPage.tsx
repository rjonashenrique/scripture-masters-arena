import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayerAvatar from '@/components/PlayerAvatar';
import { useShop, CATEGORY_LABELS, RARITY, type ItemCategory } from '@/hooks/useShop';

export default function InventoryPage() {
  const navigate = useNavigate();
  const { items, owned, wallet, loading, equip, setTitle, itemById } = useShop();
  const mine = items.filter((i) => owned.has(i.id));

  const equippedId = (c: ItemCategory) =>
    c === 'avatar' ? wallet?.equipped_avatar : c === 'frame' ? wallet?.equipped_frame : c === 'badge' ? wallet?.equipped_badge : null;

  const run = async (fn: () => Promise<void>) => {
    try { await fn(); } catch (e) { toast.error((e as Error).message.replace(/^.*?:\s*/, '')); }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-12 safe-area-top">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-muted-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-extrabold font-display text-foreground">🎒 Meu Inventário</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/shop')}><ShoppingBag size={14} /> Loja</Button>
      </div>

      <div className="glass-card p-4 mb-5 text-center">
        <PlayerAvatar size={72} icon={itemById(wallet?.equipped_avatar)?.icon}
          frameStyle={itemById(wallet?.equipped_frame)?.style} fallback={wallet?.level ?? 1} />
        <p className="text-sm font-bold text-foreground mt-3">
          {itemById(wallet?.equipped_badge)?.icon} {wallet?.active_title || 'Sem título'}
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>
      ) : mine.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Você ainda não tem itens.</p>
          <Button className="mt-4" onClick={() => navigate('/shop')}>Ir para a Loja</Button>
        </div>
      ) : (
        (Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((c) => {
          const group = mine.filter((i) => i.category === c);
          if (!group.length) return null;
          return (
            <div key={c} className="mb-5">
              <h2 className="text-sm font-bold text-foreground mb-2">{CATEGORY_LABELS[c]}</h2>
              <div className="space-y-2">
                {group.map((it) => {
                  const on = c === 'title' ? wallet?.active_title === it.name : equippedId(c) === it.id;
                  return (
                    <div key={it.id} className="glass-card p-3 flex items-center gap-3">
                      <span className="text-2xl w-10 text-center">{it.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{it.name}</p>
                        <p className={`text-[10px] ${RARITY[it.rarity].cls}`}>{RARITY[it.rarity].dot} {RARITY[it.rarity].label}</p>
                      </div>
                      <Button size="sm" variant={on ? 'outline' : 'default'}
                        onClick={() => run(() => c === 'title' ? setTitle(on ? '' : it.name) : equip(c, on ? null : it.id))}>
                        {on ? 'Desequipar' : 'Equipar'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
