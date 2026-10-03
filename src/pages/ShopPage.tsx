import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Backpack, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PlayerAvatar from '@/components/PlayerAvatar';
import { useShop, CATEGORY_LABELS, RARITY, fmt, type ShopItem, type ItemCategory } from '@/hooks/useShop';

export default function ShopPage() {
  const navigate = useNavigate();
  const { items, owned, wallet, loading, buy } = useShop();
  const [cat, setCat] = useState<ItemCategory | 'featured'>('featured');
  const [confirm, setConfirm] = useState<ShopItem | null>(null);
  const [short, setShort] = useState<ShopItem | null>(null);
  const [busy, setBusy] = useState(false);

  const coins = wallet?.coins ?? 0;
  const list = cat === 'featured' ? items.filter((i) => i.featured) : items.filter((i) => i.category === cat);

  const tryBuy = (it: ShopItem) => (coins < it.price ? setShort(it) : setConfirm(it));

  const doBuy = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res = await buy(confirm.id);
      if (res.ok) toast.success('🎉 Compra realizada!');
      else setShort(confirm);
    } catch (e) {
      toast.error((e as Error).message.replace(/^.*?:\s*/, ''));
    }
    setBusy(false);
    setConfirm(null);
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-12 safe-area-top">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-muted-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-extrabold font-display text-foreground">🛍️ Loja</h1>
        <Button size="sm" variant="outline" onClick={() => navigate('/inventory')}><Backpack size={14} /> Inventário</Button>
      </div>

      <div className="glass-card p-3 flex justify-around text-center mb-4">
        <div><p className="text-lg font-bold text-gradient-gold">🪙 {fmt(coins)}</p><p className="text-[10px] text-muted-foreground">Moedas Bíblicas</p></div>
        <div><p className="text-lg font-bold text-foreground">⭐ {wallet?.level ?? 1}</p><p className="text-[10px] text-muted-foreground">Nível</p></div>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mb-4">Itens são só visuais — nenhum dá vantagem nas partidas.</p>

      <Tabs value={cat} onValueChange={(v) => setCat(v as any)} className="mb-4">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="featured">✨ Destaques</TabsTrigger>
          {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((c) => (
            <TabsTrigger key={c} value={c}>{CATEGORY_LABELS[c]}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground py-10">Carregando loja...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((it, i) => {
            const has = owned.has(it.id);
            const locked = (wallet?.level ?? 1) < it.min_level;
            const r = RARITY[it.rarity];
            return (
              <motion.div key={it.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card p-3 flex flex-col items-center text-center">
                {it.category === 'frame'
                  ? <PlayerAvatar size={56} frameStyle={it.style} fallback={it.icon} />
                  : <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center text-3xl">{it.icon}</div>}
                <p className="text-xs font-bold text-foreground mt-3 leading-tight">{it.name}</p>
                <p className={`text-[10px] font-bold uppercase mt-1 ${r.cls}`}>{r.dot} {r.label}</p>
                {it.min_level > 1 && <p className="text-[10px] text-muted-foreground">⭐ Nível {it.min_level}</p>}
                <div className="mt-auto pt-3 w-full">
                  {has ? (
                    <Button size="sm" variant="outline" className="w-full" disabled><Check size={14} /> Adquirido</Button>
                  ) : locked ? (
                    <Button size="sm" variant="outline" className="w-full" disabled><Lock size={14} /> Nível {it.min_level}</Button>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => tryBuy(it)}>🪙 {fmt(it.price)}</Button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {list.length === 0 && <p className="col-span-2 text-center text-sm text-muted-foreground py-8">Nenhum item aqui ainda.</p>}
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Comprar este item?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-center">
                <p className="text-3xl">{confirm?.icon}</p>
                <p className="font-bold text-foreground">{confirm?.name}</p>
                <p>Preço: 🪙 {fmt(confirm?.price ?? 0)}</p>
                <p>Seu saldo: 🪙 {fmt(coins)}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={doBuy}>Comprar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!short} onOpenChange={(o) => !o && setShort(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🪙 Moedas insuficientes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1">
                <p>Você possui: {fmt(coins)}</p>
                <p>Necessário: {fmt(short?.price ?? 0)}</p>
                <p className="font-bold text-foreground">Faltam: {fmt(Math.max(0, (short?.price ?? 0) - coins))} moedas</p>
                <p className="text-xs pt-2">Ganhe moedas concluindo partidas (+5) e subindo de nível (+25 ou mais nos marcos).</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate('/')}>Ver formas de ganhar moedas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
