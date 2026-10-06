import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, Receipt, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ShopItemCard from '@/components/shop/ShopItemCard';
import ItemDetailDialog from '@/components/shop/ItemDetailDialog';
import { InventoryView } from '@/pages/InventoryPage';
import { useShop, CATEGORY_LABELS, RARITY, RARITY_ORDER, fmt, lockReason, type ItemCategory, type ShopItem, type ShopBundle } from '@/hooks/useShop';

type Tab = 'featured' | ItemCategory | 'bundles' | 'favorites' | 'inventory';
type Sort = 'popular' | 'recent' | 'price_asc' | 'price_desc' | 'rarity';

export default function ShopPage() {
  const navigate = useNavigate();
  const shop = useShop();
  const { items, bundles, collections, wallet, loading, daily, favorites, owned } = shop;
  const [tab, setTab] = useState<Tab>('featured');
  const [q, setQ] = useState('');
  const [rarity, setRarity] = useState<'all' | string>('all');
  const [avail, setAvail] = useState<'all' | 'unlocked' | 'owned' | 'not_owned'>('all');
  const [sort, setSort] = useState<Sort>('popular');
  const [open, setOpen] = useState<ShopItem | null>(null);
  const [bundleConfirm, setBundleConfirm] = useState<ShopBundle | null>(null);
  const [busy, setBusy] = useState(false);

  const level = wallet?.level ?? 1;
  const coins = wallet?.coins ?? 0;

  const list = useMemo(() => {
    let l = items;
    if (tab === 'featured') l = l.filter((i) => i.featured);
    else if (tab === 'favorites') l = l.filter((i) => favorites.has(i.id));
    else if (tab in CATEGORY_LABELS) l = l.filter((i) => i.category === tab);
    const s = q.trim().toLowerCase();
    if (s) l = l.filter((i) => `${i.name} ${CATEGORY_LABELS[i.category]} ${RARITY[i.rarity].label}`.toLowerCase().includes(s));
    if (rarity !== 'all') l = l.filter((i) => i.rarity === rarity);
    if (avail === 'unlocked') l = l.filter((i) => !lockReason(i, level));
    if (avail === 'owned') l = l.filter((i) => shop.isOwned(i));
    if (avail === 'not_owned') l = l.filter((i) => !shop.isOwned(i));
    const r = (x: ShopItem) => RARITY_ORDER.indexOf(x.rarity);
    const sorted = [...l];
    sorted.sort((a, b) =>
      sort === 'popular' ? b.sold_count - a.sold_count
      : sort === 'recent' ? b.created_at.localeCompare(a.created_at)
      : sort === 'price_asc' ? a.price - b.price
      : sort === 'price_desc' ? b.price - a.price
      : r(b) - r(a));
    return sorted;
  }, [items, tab, q, rarity, avail, sort, favorites, level, shop]);

  const favFeatured = items.filter((i) => i.featured && favorites.has(i.id) && !shop.isOwned(i));
  const newest = [...items].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const claim = async () => {
    try { const r = await shop.claimDaily(); toast.success(`🎁 +${r.amount} moedas (dia ${r.day})`); }
    catch (e) { toast.error((e as Error).message); }
  };

  const buyBundle = async () => {
    if (!bundleConfirm) return;
    setBusy(true);
    try {
      const r = await shop.buyBundle(bundleConfirm.id);
      if (r.ok) toast.success('🎉 Pacote comprado!');
      else toast.error(`🪙 Moedas insuficientes — faltam ${fmt((r.price ?? 0) - r.balance)}`);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false); setBundleConfirm(null);
  };

  const showFilters = !['bundles', 'inventory'].includes(tab);

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* barra fixa */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border px-5 pt-10 pb-3 safe-area-top">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-muted-foreground p-1"><ArrowLeft size={20} /></button>
          <h1 className="text-xl font-extrabold font-display text-foreground">🛍️ Loja</h1>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Histórico de compras" onClick={() => navigate('/shop/history')}><Receipt size={18} /></Button>
            <Button size="icon" variant="ghost" aria-label="Inventário" onClick={() => setTab('inventory')}><Backpack size={18} /></Button>
          </div>
        </div>
        <div className="flex justify-around text-center mt-2 text-xs">
          <span aria-label={`Saldo ${coins} moedas`} className="font-bold text-gradient-gold">🪙 {fmt(coins)}</span>
          <span className="font-bold text-foreground">⭐ Nível {level}</span>
          <span className="font-bold text-foreground">🎒 {owned.size} itens</span>
        </div>
      </div>

      <div className="px-5 pt-4">
        {daily && (
          <div className="glass-card p-3 mb-3 flex items-center gap-3">
            <span className="text-2xl" aria-hidden>🎁</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Recompensa do Dia</p>
              <p className="text-[11px] text-muted-foreground">
                {daily.claimed_today ? `Resgatada hoje (dia ${daily.day}). Volte amanhã!` : `Dia ${daily.day} de 7 — ${daily.amount} moedas grátis`}
              </p>
            </div>
            <Button size="sm" disabled={daily.claimed_today} onClick={claim}>{daily.claimed_today ? 'Feito' : 'Resgatar'}</Button>
          </div>
        )}

        {favFeatured.length > 0 && (
          <div role="status" className="rounded-xl border border-secondary/40 bg-secondary/10 p-3 mb-3 text-xs text-foreground">
            ❤️ Da sua lista de desejos em destaque: <b>{favFeatured.map((i) => i.name).join(', ')}</b>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center mb-3">Itens são só visuais — nenhum dá vantagem nas partidas.</p>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-3">
          <TabsList className="w-full flex-wrap h-auto justify-start">
            <TabsTrigger value="featured">⭐ Destaques</TabsTrigger>
            {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((c) => <TabsTrigger key={c} value={c}>{CATEGORY_LABELS[c]}</TabsTrigger>)}
            <TabsTrigger value="bundles">🎁 Pacotes</TabsTrigger>
            <TabsTrigger value="favorites">❤️ Favoritos</TabsTrigger>
            <TabsTrigger value="inventory">🎒 Inventário</TabsTrigger>
          </TabsList>
        </Tabs>

        {showFilters && (
          <div className="space-y-2 mb-4">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value.slice(0, 60))} placeholder="🔍 Pesquisar na Loja" aria-label="Pesquisar na Loja" className="pl-8" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={rarity} onValueChange={setRarity}>
                <SelectTrigger aria-label="Raridade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Raridade</SelectItem>
                  {RARITY_ORDER.map((r) => <SelectItem key={r} value={r}>{RARITY[r].dot} {RARITY[r].label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={avail} onValueChange={(v) => setAvail(v as any)}>
                <SelectTrigger aria-label="Disponibilidade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unlocked">Desbloqueados</SelectItem>
                  <SelectItem value="owned">Já possuo</SelectItem>
                  <SelectItem value="not_owned">Não possuo</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger aria-label="Ordenar"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Mais populares</SelectItem>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="rarity">Raridade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-10">Carregando loja...</p>
        ) : tab === 'inventory' ? (
          <InventoryView shop={shop} />
        ) : tab === 'bundles' ? (
          <div className="space-y-3">
            {bundles.map((b) => {
              const its = b.item_ids.map((id) => items.find((i) => i.id === id)).filter(Boolean) as ShopItem[];
              const full = its.reduce((s, i) => s + i.price, 0);
              const allOwned = its.every((i) => owned.has(i.id));
              return (
                <div key={b.id} className="glass-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl" aria-hidden>{b.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{its.map((i) => i.name).join(' · ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Separado: <s>🪙 {fmt(full)}</s></p>
                      <p className="font-bold text-foreground">Pacote: 🪙 {fmt(b.price)} {full > b.price && <span className="text-success">(economia de {fmt(full - b.price)})</span>}</p>
                    </div>
                    <Button size="sm" disabled={allOwned} onClick={() => setBundleConfirm(b)}>{allOwned ? 'Adquirido' : 'Comprar'}</Button>
                  </div>
                </div>
              );
            })}
            {bundles.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum pacote no momento.</p>}
          </div>
        ) : (
          <>
            {tab === 'featured' && (
              <>
                <h2 className="text-sm font-bold text-foreground mb-2">⭐ Destaques da Semana</h2>
                {newest && <p className="text-[11px] text-muted-foreground mb-2">🔥 Novo: {newest.name}</p>}
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              {list.map((it, i) => (
                <ShopItemCard key={it.id} it={it} index={i} level={level} owned={shop.isOwned(it)} equipped={shop.isEquipped(it)}
                  favorite={favorites.has(it.id)} onFavorite={() => shop.toggleFavorite(it.id).catch((e) => toast.error(e.message))}
                  onOpen={() => { setOpen(it); shop.logView(it.id); }} />
              ))}
              {list.length === 0 && <p className="col-span-2 text-center text-sm text-muted-foreground py-8">Nenhum item encontrado.</p>}
            </div>

            {tab === 'featured' && collections.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-bold text-foreground mb-2">📚 Coleções</h2>
                {collections.map((c) => {
                  const pieces = items.filter((i) => i.collection === c.id && i.id !== c.reward_item_id);
                  const have = pieces.filter((i) => owned.has(i.id)).length;
                  const reward = items.find((i) => i.id === c.reward_item_id);
                  return (
                    <div key={c.id} className="glass-card p-3 mb-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-foreground">{c.icon} {c.name}</span>
                        <span className="text-muted-foreground">{have} / {pieces.length} itens</span>
                      </div>
                      <div className="flex gap-1 mt-2 text-xl" aria-label="Peças da coleção">
                        {pieces.map((p) => <span key={p.id} title={p.name} className={owned.has(p.id) ? '' : 'opacity-30 grayscale'}>{p.icon}</span>)}
                      </div>
                      {reward && <p className="text-[11px] text-muted-foreground mt-1">🎁 Ao completar: {reward.name}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {open && <ItemDetailDialog item={open} shop={shop} onClose={() => setOpen(null)} />}

      {bundleConfirm && (
        <ItemBundleConfirm bundle={bundleConfirm} coins={coins} busy={busy} onCancel={() => setBundleConfirm(null)} onConfirm={buyBundle} />
      )}
    </div>
  );
}

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function ItemBundleConfirm({ bundle, coins, busy, onCancel, onConfirm }: {
  bundle: ShopBundle; coins: number; busy: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Comprar {bundle.name}?</AlertDialogTitle>
          <AlertDialogDescription>Preço: 🪙 {fmt(bundle.price)} · Seu saldo: 🪙 {fmt(coins)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirm}>Comprar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
