import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORY_LABELS, RARITY, RARITY_ORDER, fmt, type ShopItem, type ItemCategory } from '@/hooks/useShop';

const from = (t: string) => (supabase.from as any)(t);
const rpc = (n: string, a?: object) => (supabase.rpc as any)(n, a);

const EMPTY: Partial<ShopItem> = {
  id: '', name: '', category: 'avatar', rarity: 'common', price: 100, min_level: 1, icon: '⭐', style: '',
  description: '', featured: false, is_active: true, purchasable: true, requirement: null, requirement_label: '',
  stock_limit: null, starts_at: null, ends_at: null, event_label: '', collection: null, clan_slot: null, sort_order: 0,
};

async function audit(action: string, id: string, oldV: unknown, newV: unknown) {
  await rpc('admin_log', { p_action: action, p_entity_type: 'shop_item', p_entity_id: id, p_old: oldV ?? null, p_new: newV ?? null, p_reason: null });
}

export default function ShopTab() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [edit, setEdit] = useState<Partial<ShopItem> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [days, setDays] = useState(30);

  const load = () => from('shop_items').select('*').order('category').order('sort_order').then(({ data }: any) => setItems(data ?? []));
  useEffect(() => { load(); }, []);
  useEffect(() => { rpc('admin_shop_analytics', { p_days: days }).then(({ data }: any) => setStats(data)); }, [days]);

  const save = async () => {
    if (!edit?.id || !edit.name) return toast.error('ID e nome são obrigatórios');
    if (!/^[a-z0-9_]{3,40}$/.test(edit.id)) return toast.error('ID: só letras minúsculas, números e _');
    const row = { ...edit, price: Math.max(0, Number(edit.price) || 0), min_level: Math.max(1, Number(edit.min_level) || 1),
      stock_limit: edit.stock_limit ? Number(edit.stock_limit) : null, requirement: edit.requirement || null,
      starts_at: edit.starts_at || null, ends_at: edit.ends_at || null, collection: edit.collection || null, clan_slot: edit.clan_slot || null };
    delete (row as any).created_at; delete (row as any).sold_count;
    const old = items.find((i) => i.id === edit.id);
    const { error } = isNew ? await from('shop_items').insert(row) : await from('shop_items').update(row).eq('id', edit.id);
    if (error) return toast.error(error.message);
    await audit(isNew ? 'shop_item_create' : 'shop_item_update', edit.id, old, row);
    toast.success('Item salvo'); setEdit(null); load();
  };

  const patch = async (it: ShopItem, change: Partial<ShopItem>, action: string) => {
    const { error } = await from('shop_items').update(change).eq('id', it.id);
    if (error) return toast.error(error.message);
    await audit(action, it.id, it, change); load();
  };

  const F = (k: keyof ShopItem, label: string, type = 'text') => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={(edit?.[k] as any) ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">🛍️ Loja</h2>
      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">Itens</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="economy">🪙 Economia</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-3">
          <Button onClick={() => { setIsNew(true); setEdit({ ...EMPTY }); }}>➕ Criar item</Button>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs">
                <tr><th className="p-2">Item</th><th>Categoria</th><th>Raridade</th><th>Preço</th><th>Nível</th><th>Vendidos</th><th>Status</th><th className="text-right p-2">Ações</th></tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="p-2">{it.icon} {it.name}</td>
                    <td>{CATEGORY_LABELS[it.category]}</td>
                    <td>{RARITY[it.rarity].dot} {RARITY[it.rarity].label}</td>
                    <td>{it.purchasable ? fmt(it.price) : '—'}</td>
                    <td>{it.min_level}</td>
                    <td>{it.sold_count}{it.stock_limit ? ` / ${it.stock_limit}` : ''}</td>
                    <td>{it.is_active ? 'Ativo' : 'Arquivado'}{it.featured ? ' · ⭐' : ''}</td>
                    <td className="p-2 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => { setIsNew(false); setEdit(it); }}>✏️</Button>
                      <Button size="sm" variant="outline" aria-label="Destacar" onClick={() => patch(it, { featured: !it.featured }, 'shop_item_feature')}>⭐</Button>
                      <Button size="sm" variant="outline" onClick={() => patch(it, { is_active: !it.is_active }, it.is_active ? 'shop_item_archive' : 'shop_item_restore')}>
                        {it.is_active ? '📦 Arquivar' : 'Reativar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Itens arquivados somem da loja, mas quem já comprou continua com eles.</p>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="flex gap-2 mb-3">
            {[7, 30, 90].map((d) => <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'} onClick={() => setDays(d)}>{d} dias</Button>)}
          </div>
          {stats && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Resumo">
                <p>Compras: {stats.purchases} · Visualizações: {stats.views}</p>
                <p>Conversão: {stats.views ? Math.round((stats.purchases / stats.views) * 100) : 0}%</p>
                <p>Compradores ativos: {stats.buyers}</p>
                <p>Moedas gastas: {fmt(stats.coins_spent)} · distribuídas: {fmt(stats.coins_issued)}</p>
              </Card>
              <Card title="Mais comprados">{(stats.top_items as any[]).map((t) => <p key={t.name}>{t.icon} {t.name} — {t.sold}</p>)}</Card>
              <Card title="Mais equipados">{(stats.top_equipped as any[]).map((t) => <p key={t.name}>{t.icon} {t.name} — {t.n}</p>)}</Card>
              <Card title="Raridades adquiridas">{Object.entries(stats.by_rarity ?? {}).map(([k, v]) => <p key={k}>{RARITY[k as keyof typeof RARITY]?.label ?? k}: {String(v)}</p>)}</Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="economy">
          {stats && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card title="Visão geral">
                <p>Moedas emitidas ({days}d): {fmt(stats.coins_issued)}</p>
                <p>Moedas gastas ({days}d): {fmt(stats.coins_spent)}</p>
                <p>Saldo total em circulação: {fmt(stats.total_balance)}</p>
                <p>Saldo médio por jogador: {fmt(stats.avg_balance)}</p>
                <p>Inflação do período: {stats.coins_issued - stats.coins_spent >= 0 ? '+' : ''}{fmt(stats.coins_issued - stats.coins_spent)} moedas</p>
              </Card>
              <Card title="Fontes de moedas">{Object.entries(stats.sources ?? {}).map(([k, v]) => <p key={k}>{k}: {fmt(Number(v))}</p>)}</Card>
              <Card title="Principais gastos">{Object.entries(stats.sinks ?? {}).map(([k, v]) => <p key={k}>{k}: {fmt(Number(v))}</p>)}</Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>{isNew ? 'Criar item' : 'Editar item'}</DialogTitle>
          {edit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">ID</Label>
                <Input disabled={!isNew} value={edit.id ?? ''} onChange={(e) => setEdit({ ...edit, id: e.target.value })} />
              </div>
              {F('name', 'Nome')}
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v as ItemCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Raridade</Label>
                <Select value={edit.rarity} onValueChange={(v) => setEdit({ ...edit, rarity: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RARITY_ORDER.map((r) => <SelectItem key={r} value={r}>{RARITY[r].dot} {RARITY[r].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {F('price', 'Preço (moedas)', 'number')}
              {F('min_level', 'Nível mínimo', 'number')}
              {F('icon', 'Ícone / preview (emoji)')}
              {F('style', 'Estilo visual (bronze, gold, fire, glow...)')}
              {F('requirement', 'Requisito (achievement:id, answered:N, clan_founder, cup_winner)')}
              {F('requirement_label', 'Texto do requisito')}
              {F('stock_limit', 'Quantidade limitada (vazio = sem limite)', 'number')}
              {F('event_label', 'Evento (ex.: Semana Bíblica)')}
              {F('starts_at', 'Início', 'datetime-local')}
              {F('ends_at', 'Fim', 'datetime-local')}
              {F('collection', 'Coleção (id)')}
              {F('clan_slot', 'Slot do clã (banner/frame)')}
              <div className="col-span-2">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value.slice(0, 200) })} />
              </div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.purchasable} onCheckedChange={(v) => setEdit({ ...edit, purchasable: v })} /> Comprável</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!edit.featured} onCheckedChange={(v) => setEdit({ ...edit, featured: v })} /> Destaque</label>
              <div className="col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
                <Button onClick={save}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4 text-sm space-y-1">
      <p className="font-bold mb-2">{title}</p>
      {children}
    </div>
  );
}
