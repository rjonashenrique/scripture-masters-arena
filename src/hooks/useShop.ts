import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);

export type ItemCategory = 'avatar' | 'frame' | 'title' | 'badge';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ShopItem {
  id: string; name: string; category: ItemCategory; rarity: Rarity; price: number;
  min_level: number; icon: string; style: string; description: string; featured: boolean;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  avatar: '🎨 Avatares', frame: '🖼️ Molduras', title: '🏷️ Títulos', badge: '🏅 Badges',
};

export const RARITY: Record<Rarity, { label: string; dot: string; cls: string }> = {
  common: { label: 'Comum', dot: '⚪', cls: 'text-muted-foreground' },
  rare: { label: 'Raro', dot: '🔵', cls: 'text-primary' },
  epic: { label: 'Épico', dot: '🟣', cls: 'text-accent-foreground' },
  legendary: { label: 'Lendário', dot: '🟡', cls: 'text-secondary' },
};

/** Classes de moldura (somente tokens do tema). */
export const FRAME_CLASS: Record<string, string> = {
  leaf: 'ring-4 ring-success',
  fire: 'ring-4 ring-destructive',
  diamond: 'ring-4 ring-primary shadow-glow-blue',
  legend: 'ring-4 ring-secondary shadow-glow-gold',
  guardian: 'ring-[6px] ring-secondary shadow-glow-gold outline outline-2 outline-offset-4 outline-primary',
};

export interface PlayerWallet {
  coins: number; level: number; xp: number;
  equipped_avatar: string | null; equipped_frame: string | null; equipped_badge: string | null;
  active_title: string;
}

export function useShop() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [wallet, setWallet] = useState<PlayerWallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [it, inv, prof] = await Promise.all([
      supabase.from('shop_items' as any).select('*').eq('is_active', true).order('sort_order'),
      supabase.from('user_inventory' as any).select('item_id').eq('user_id', user.id),
      supabase.from('profiles').select('coins, level, xp, equipped_avatar, equipped_frame, equipped_badge, active_title').eq('id', user.id).single(),
    ]);
    setItems((it.data ?? []) as unknown as ShopItem[]);
    setOwned(new Set(((inv.data ?? []) as any[]).map((r) => r.item_id)));
    if (prof.data) setWallet(prof.data as unknown as PlayerWallet);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const buy = async (id: string) => {
    const { data, error } = await rpc('buy_shop_item', { p_item_id: id });
    if (error) throw new Error(error.message);
    await refresh();
    return data as { ok: boolean; reason?: string; balance: number; price?: number };
  };

  const equip = async (category: ItemCategory, id: string | null) => {
    const { error } = await rpc('equip_item', { p_category: category, p_item_id: id });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const setTitle = async (title: string) => {
    const { error } = await rpc('set_active_title', { p_title: title });
    if (error) throw new Error(error.message);
    await refresh();
  };

  const itemById = (id?: string | null) => items.find((i) => i.id === id);

  return { items, owned, wallet, loading, buy, equip, setTitle, itemById, refresh };
}

export const fmt = (n: number) => n.toLocaleString('pt-BR');
