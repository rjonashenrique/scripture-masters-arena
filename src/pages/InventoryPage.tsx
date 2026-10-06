import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PlayerAvatar from '@/components/PlayerAvatar';
import { useShop, CATEGORY_LABELS, RARITY, RARITY_ORDER, type ItemCategory } from '@/hooks/useShop';

type Shop = ReturnType<typeof useShop>;
type Filter = 'all' | 'equipped' | 'favorites' | ItemCategory;

export function InventoryView({ shop }: { shop: Shop }) {
  const navigate = useNavigate();
  const { items, wallet, favorites, itemById, clanRole } = shop;
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'recent' | 'rarity' | 'name'>('recent');

  let mine = items.filter((i) => shop.isOwned(i));
  if (filter === 'equipped') mine = mine.filter((i) => shop.isEquipped(i));
  else if (filter === 'favorites') mine = mine.filter((i) => favorites.has(i.id));
  else if (filter !== 'all') mine = mine.filter((i) => i.category === filter);
  mine = [...mine].sort((a, b) =>
    sort === 'name' ? a.name.localeCompare(b.name)
    : sort === 'rarity' ? RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
    : b.sort_order - a.sort_order);

  const toggle = async (id: string, on: boolean) => {
    try { await shop.equip(id, on); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <>
      <div className="glass-card p-4 mb-4 text-center">
        <PlayerAvatar size={72} icon={itemById(wallet?.equipped_avatar)?.icon}
          frameStyle={itemById(wallet?.equipped_frame)?.style} effectStyle={itemById(wallet?.equipped_effect)?.style}
          fallback={wallet?.level ?? 1} />
        <p className="text-sm font-bold text-foreground mt-3">{wallet?.active_title || 'Sem título'}</p>
        <p className="text-lg mt-1" aria-label="Badges em destaque">
          {(wallet?.featured_badges ?? []).map((b) => itemById(b)?.icon).join(' ') || <span className="text-xs text-muted-foreground">Até 3 badges em destaque</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger aria-label="Filtrar"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="equipped">Equipados</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
            <SelectItem value="favorites">❤️ Favoritos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger aria-label="Ordenar"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recente</SelectItem>
            <SelectItem value="rarity">Raridade</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mine.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhum item aqui.</p>
          <Button className="mt-4" onClick={() => navigate('/shop')}>Ir para a Loja</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {mine.map((it) => {
            const on = shop.isEquipped(it);
            const clanLocked = it.category === 'clan' && !['leader', 'vice'].includes(clanRole ?? '');
            return (
              <div key={it.id} className="glass-card p-3 flex items-center gap-3">
                <span className="text-2xl w-10 text-center" aria-hidden>{it.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{it.name}</p>
                  <p className={`text-[10px] ${RARITY[it.rarity].cls}`}>{RARITY[it.rarity].dot} {RARITY[it.rarity].label} · {CATEGORY_LABELS[it.category]}</p>
                </div>
                {clanLocked ? (
                  <span className="text-[10px] text-muted-foreground">Só líder/vice</span>
                ) : (
                  <Button size="sm" variant={on ? 'outline' : 'default'} onClick={() => toggle(it.id, !on)}>
                    {on ? 'Desequipar' : 'Equipar'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const shop = useShop();
  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-12 safe-area-top">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-muted-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-extrabold font-display text-foreground">🎒 Inventário</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/shop')}><ShoppingBag size={14} /> Loja</Button>
      </div>
      {shop.loading ? <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p> : <InventoryView shop={shop} />}
    </div>
  );
}
