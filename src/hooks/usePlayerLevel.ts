import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);

export interface LevelInfo {
  level: number;
  name: string;
  total_xp: number;
  level_xp: number;
  next_level_xp: number;
  remaining_xp: number;
  progress: number;
  next_name: string | null;
}

export interface XpAward {
  granted: number;
  reason?: string;
  old_level?: number;
  new_level?: number;
  coins?: number;
  new_titles?: string[];
  info?: LevelInfo;
}

export type XpSource = 'quiz' | 'challenge' | 'battle' | 'battle_royale';

const LEVEL_EVENT = 'player-level-changed';
const LEVEL_UP_EVENT = 'player-level-up';

/** Calcula e concede XP no servidor. Nível e XP nunca são alterados pelo app. */
export async function awardPlayerXp(source: XpSource, correct: number, total: number, durationMs: number) {
  const { data, error } = await rpc('award_player_xp', {
    p_source: source, p_correct: correct, p_total: total, p_duration_ms: Math.round(durationMs),
  });
  if (error) return null;
  const res = data as XpAward;
  window.dispatchEvent(new Event(LEVEL_EVENT));
  if (res.new_level && res.old_level && res.new_level > res.old_level) {
    window.dispatchEvent(new CustomEvent(LEVEL_UP_EVENT, { detail: res }));
  }
  return res;
}

export function onLevelUp(cb: (a: XpAward) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail as XpAward);
  window.addEventListener(LEVEL_UP_EVENT, h);
  return () => window.removeEventListener(LEVEL_UP_EVENT, h);
}

export function usePlayerLevel() {
  const { user } = useAuth();
  const [info, setInfo] = useState<LevelInfo | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return setInfo(null);
    const { data } = await rpc('my_level_info');
    if (data) setInfo(data as LevelInfo);
  }, [user]);

  useEffect(() => {
    refresh();
    window.addEventListener(LEVEL_EVENT, refresh);
    return () => window.removeEventListener(LEVEL_EVENT, refresh);
  }, [refresh]);

  return { info, refresh };
}

export const fmtXp = (n: number) => n.toLocaleString('pt-BR');
