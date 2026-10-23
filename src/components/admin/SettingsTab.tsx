import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export interface Setting {
  key: string; value: boolean | number | string; label: string; category: string; updated_at: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  sistema: 'Sistema', modos: 'Modos de jogo', clas: 'Clãs', recompensas: 'Recompensas', geral: 'Geral',
};

export function useSettings() {
  const [items, setItems] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('app_settings').select('*').order('category');
    setItems((data as Setting[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (key: string, value: boolean) => {
    const { error } = await (supabase.rpc as any)('admin_set_setting', { p_key: key, p_value: value });
    if (error) return toast.error(error.message);
    toast.success('Configuração salva');
    load();
  };

  return { items, loading, update };
}

export default function SettingsTab({ only, title }: { only?: string; title?: string }) {
  const { items, loading, update } = useSettings();
  if (loading) return <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>;

  const filtered = only ? items.filter((i) => i.category === only) : items;
  const groups = filtered.reduce<Record<string, Setting[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title ?? (only === 'modos' ? 'Modos de Jogo' : 'Configurações')}</h2>
        <p className="text-xs text-muted-foreground">
          Cada chave é validada no servidor; jogadores não conseguem alterá-las.
        </p>
      </div>
      {Object.entries(groups).map(([cat, list]) => (
        <div key={cat} className="space-y-2">
          <p className="text-sm font-semibold text-foreground">{CATEGORY_LABEL[cat] ?? cat}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {list.map((s) => (
              <div key={s.key} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{s.label || s.key}</p>
                  <p className="text-[10px] text-muted-foreground">{s.key}</p>
                </div>
                <Switch checked={s.value === true || s.value === 'true'} onCheckedChange={(v) => update(s.key, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nada configurado aqui ainda.</p>}
    </div>
  );
}
