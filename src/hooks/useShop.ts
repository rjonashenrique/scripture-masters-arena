import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);
const from = (t: string) => (supabase.from as any)(t);

export type ItemCategory = 'avatar' | 'frame' | 'title' | 'effect' | 'badge' | 'clan';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface ShopItem {
  id: string; name: string; category: ItemCategory; rarity: Rarity; price: number;
  min_level: number; icon: string; style: string; description: string; featured: boolean;
  is_active: boolean; purchasable: boolean; requirement: string | null; requirement_label: string;
  stock_limit: number | null; sold_count: number; starts_at: string | null; ends_at: string | null;
  event_label: string; collection: string | null; clan_slot: string | null; created_at: string; sort_order: number;
}

export interface ShopBundle {
  id: string; name: string; description: string; icon: string; price: number; featured: boolean; is_active: boolean;
  item_ids: string[];
}

export interface ShopCollection { id: string; name: string; icon: string; description: string; reward_item_id: string | null }

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  avatar: '🎨 Avatares', frame: '🖼️ Molduras', title: '🏷️ Títulos', effect: '✨ Efeitos', badge: '🏅 Badges', clan: '🛡️ Clã',
};

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];
export const RARITY: Record<Rarity, { label: string; dot: string; cls: string }> = {
  common: { label: 'Comum', dot: '⚪', cls: 'text-muted-foreground' },
  rare: { label: 'Raro', dot: '🔵', cls: 'text-primary' },
  epic: { label: 'Épico', dot: '🟣', cls: 'text-accent-foreground' },
  legendary: { label: 'Lendário', dot: '🟡', cls: 'text-secondary' },
  mythic: { label: 'Mítico', dot: '💎', cls: 'text-gradient-gold' },
};

/** Classes visuais (somente tokens do tema). */
export const FRAME_CLASS: Record<string, string> = {
  default: '',
  none: '',
  bronze: 'ring-4 ring-accent',
  silver: 'ring-4 ring-muted-foreground',
  gold: 'ring-4 ring-secondary',
  leaf: 'ring-4 ring-success',
  fire: 'ring-4 ring-destructive',
  diamond: 'ring-4 ring-primary shadow-glow-blue',
  legend: 'ring-4 ring-secondary shadow-glow-gold',
  legendary: 'ring-4 ring-secondary shadow-glow-gold',
  guardian: 'ring-[6px] ring-secondary shadow-glow-gold outline outline-2 outline-offset-4 outline-primary',
};
export const EFFECT_CLASS: Record<string, string> = {
  glow: 'shadow-glow-gold',
  pulse: 'shadow-glow-blue motion-safe:animate-pulse',
};
export const CLAN_BANNER_CLASS: Record<string, string> = {
  default: '',
  classic: '',
  bronze: 'bg-gradient-to-br from-amber-950/70 via-card to-card border-amber-700/40',
  silver: 'bg-gradient-to-br from-slate-700/50 via-card to-card border-slate-400/40',
  gold: 'bg-gradient-to-br from-yellow-900/50 via-card to-card border-yellow-500/40',
  diamond: 'bg-gradient-to-br from-cyan-950/60 via-card to-card border-cyan-400/40',
  fire: 'border-2 border-destructive/60 bg-destructive/10',
  sky: 'border-2 border-primary/60 bg-primary/10',
  ocean: 'bg-gradient-to-br from-blue-950/60 via-card to-card border-blue-500/40',
  nature: 'bg-gradient-to-br from-emerald-950/60 via-card to-card border-emerald-500/40',
  royal: 'bg-gradient-to-br from-violet-950/60 via-card to-card border-violet-500/40',
  legendary: 'bg-gradient-to-br from-amber-950/70 via-violet-950/40 to-card border-amber-400/50',
};

export interface PlayerWallet {
  coins: number; level: number; xp: number;
  equipped_avatar: string | null; equipped_frame: string | null; equipped_badge: string | null;
  equipped_effect: string | null; featured_badges: string[]; active_title: string;
}

export interface DailyStatus { claimed_today: boolean; day: number; amount: number }

export function lockReason(it: ShopItem, level: number) {
  if (it.min_level > level) return `🔒 Nível ${it.min_level} necessário`;
  if (it.requirement && it.requirement_label) return `🔒 ${it.requirement_label}`;
  return null;
}

export function itemStatus(it: ShopItem) {
  const now = Date.now();
  if (it.stock_limit != null && it.sold_count >= it.stock_limit) return 'Esgotado';
  if (it.ends_at && new Date(it.ends_at).getTime() < now) return 'Evento encerrado';
  if (it.starts_at && new Date(it.starts_at).getTime() > now) return 'Em breve';
  if (it.stock_limit != null) return `Restam ${it.stock_limit - it.sold_count}`;
  if (!it.purchasable) return 'Conquista';
  return 'Disponível';
}

export function useShop() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [bundles, setBundles] = useState<ShopBundle[]>([]);
  const [collections, setCollections] = useState<ShopCollection[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [clanOwned, setClanOwned] = useState<Set<string>>(new Set());
  const [clanRole, setClanRole] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [wallet, setWallet] = useState<PlayerWallet | null>(null);
  const [daily, setDaily] = useState<DailyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [it, inv, prof, fav, bu, bi, col, mem, dr] = await Promise.all([
      from('shop_items').select('*').eq('is_active', true).order('sort_order'),
      from('user_inventory').select('item_id').eq('user_id', user.id),
      supabase.from('profiles').select('coins, level, xp, equipped_avatar, equipped_frame, equipped_badge, equipped_effect, featured_badges, active_title').eq('id', user.id).single(),
      from('user_favorites').select('item_id').eq('user_id', user.id),
      from('shop_bundles').select('*').eq('is_active', true),
      from('shop_bundle_items').select('*'),
      from('shop_collections').select('*'),
      supabase.from('clan_members').select('clan_id, role').eq('user_id', user.id).maybeSingle(),
      rpc('daily_reward_status'),
    ]);
    setItems((it.data ?? []) as ShopItem[]);
    setOwned(new Set(((inv.data ?? []) as any[]).map((r) => r.item_id)));
    setFavorites(new Set(((fav.data ?? []) as any[]).map((r) => r.item_id)));
    const links = (bi.data ?? []) as { bundle_id: string; item_id: string }[];
    setBundles(((bu.data ?? []) as any[]).map((b) => ({ ...b, item_ids: links.filter((l) => l.bundle_id === b.id).map((l) => l.item_id) })));
    setCollections((col.data ?? []) as ShopCollection[]);
    if (prof.data) setWallet({ ...(prof.data as any), featured_badges: ((prof.data as any).featured_badges ?? []) as string[] });
    setDaily((dr.data ?? null) as DailyStatus | null);
    const m = mem.data as { clan_id: string; role: string } | null;
    setClanRole(m?.role ?? null);
    if (m) {
      const ci = await from('clan_inventory').select('item_id').eq('clan_id', m.clan_id);
      setClanOwned(new Set(((ci.data ?? []) as any[]).map((r) => r.item_id)));
    } else setClanOwned(new Set());
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Concede badges/itens de conquista já cumpridos, depois carrega
    rpc('sync_earned_items').then(refresh);
  }, [user, refresh]);

  const fail = (error: any) => { if (error) throw new Error(String(error.message).replace(/^.*?:\s*/, '')); };

  const buy = async (id: string) => {
    const { data, error } = await rpc('purchase_shop_item', { p_item_id: id });
    fail(error); await refresh();
    return data as { ok: boolean; reason?: string; balance: number; price?: number };
  };
  const buyBundle = async (id: string) => {
    const { data, error } = await rpc('purchase_bundle', { p_bundle_id: id });
    fail(error); await refresh();
    return data as { ok: boolean; reason?: string; balance: number; price?: number };
  };
  const equip = async (id: string, on: boolean) => {
    const { error } = await rpc('equip_inventory_item', { p_item_id: id, p_equip: on });
    fail(error); await refresh();
  };
  const toggleFavorite = async (id: string) => {
    if (!user) return;
    const isFav = favorites.has(id);
    const { error } = isFav
      ? await from('user_favorites').delete().eq('user_id', user.id).eq('item_id', id)
      : await from('user_favorites').insert({ user_id: user.id, item_id: id });
    fail(error); await refresh();
  };
  const claimDaily = async () => {
    const { data, error } = await rpc('claim_daily_reward');
    fail(error); await refresh();
    return data as { day: number; amount: number; balance: number };
  };
  const logView = (id: string) => {
    if (user) from('shop_events').insert({ user_id: user.id, item_id: id, kind: 'view' }).then(() => {});
  };

  const isOwned = (it: ShopItem) => (it.category === 'clan' ? clanOwned.has(it.id) : owned.has(it.id));
  const isEquipped = (it: ShopItem) => {
    if (!wallet) return false;
    switch (it.category) {
      case 'avatar': return wallet.equipped_avatar === it.id;
      case 'frame': return wallet.equipped_frame === it.id;
      case 'effect': return wallet.equipped_effect === it.id;
      case 'title': return wallet.active_title === it.name;
      case 'badge': return wallet.featured_badges.includes(it.id);
      default: return false;
    }
  };
  const itemById = (id?: string | null) => items.find((i) => i.id === id);

  return {
    items, bundles, collections, owned, clanOwned, clanRole, favorites, wallet, daily, loading,
    buy, buyBundle, equip, toggleFavorite, claimDaily, logView, isOwned, isEquipped, itemById, refresh,
  };
}

export const fmt = (n: number) => n.toLocaleString('pt-BR');
