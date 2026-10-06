import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fmt } from '@/hooks/useShop';

interface Tx { id: string; amount: number; reason: string; ref: string | null; balance_after: number; created_at: string }

const REASON: Record<string, string> = {
  compra: '🛍️ Compra', pacote: '🎁 Pacote', partida: '🎮 Partida concluída', nivel: '⭐ Subiu de nível', diaria: '🎁 Recompensa do dia',
};

export default function ShopHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'purchases' | 'rewards' | 'all'>('purchases');

  useEffect(() => {
    if (!user) return;
    (supabase.from as any)('coin_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200)
      .then(({ data }: any) => setTxs(data ?? []));
    Promise.all([
      (supabase.from as any)('shop_items').select('id,name,icon'),
      (supabase.from as any)('shop_bundles').select('id,name,icon'),
    ]).then(([a, b]: any[]) => {
      const m: Record<string, string> = {};
      [...(a.data ?? []), ...(b.data ?? [])].forEach((i: any) => { m[i.id] = `${i.icon} ${i.name}`; });
      setNames(m);
    });
  }, [user]);

  const list = txs.filter((t) =>
    tab === 'purchases' ? t.amount < 0 : tab === 'rewards' ? t.amount > 0 && ['nivel', 'diaria'].includes(t.reason) : t.amount > 0);

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-12 safe-area-top">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-muted-foreground"><ArrowLeft size={20} /></button>
        <h1 className="text-2xl font-extrabold font-display text-foreground">🧾 Compras</h1>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="purchases" className="flex-1">Compras</TabsTrigger>
          <TabsTrigger value="rewards" className="flex-1">Recompensas</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">Moedas recebidas</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="space-y-2">
        {list.map((t) => (
          <div key={t.id} className="glass-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {t.ref && names[t.ref] ? names[t.ref] : REASON[t.reason] ?? t.reason}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {REASON[t.reason] ?? t.reason} · {new Date(t.created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${t.amount < 0 ? 'text-destructive' : 'text-success'}`}>
                {t.amount > 0 ? '+' : ''}{fmt(t.amount)} 🪙
              </p>
              <p className="text-[10px] text-muted-foreground">Saldo: {fmt(t.balance_after)}</p>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-10">Nada por aqui ainda.</p>}
      </div>
    </div>
  );
}
