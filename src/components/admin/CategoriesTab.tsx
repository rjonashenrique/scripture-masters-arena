import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface Category {
  id: string; slug: string; name: string; icon: string; sort_order: number; is_active: boolean;
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function CategoriesTab() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📖');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('question_categories').select('*').order('sort_order');
    setItems((data as Category[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return toast.error('Informe o nome');
    const { error } = await (supabase as any).from('question_categories').insert({
      name: name.trim(), slug: slugify(name), icon: icon || '📖', sort_order: items.length + 1,
    });
    if (error) return toast.error(error.message);
    await (supabase.rpc as any)('admin_log', { p_action: 'category_create', p_entity_type: 'question_categories', p_entity_id: slugify(name) });
    setName('');
    toast.success('Categoria criada');
    load();
  };

  const toggle = async (c: Category) => {
    const { error } = await (supabase as any).from('question_categories').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) return toast.error(error.message);
    await (supabase.rpc as any)('admin_log', { p_action: 'category_toggle', p_entity_type: 'question_categories', p_entity_id: c.slug, p_new: { is_active: !c.is_active } });
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Categorias</h2>
      <div className="flex flex-wrap gap-2">
        <Input className="w-20" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ícone" />
        <Input className="flex-1 min-w-[200px]" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" />
        <Button onClick={create}><Plus size={16} /> Criar</Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{c.icon} {c.name}</p>
              <p className="text-[10px] text-muted-foreground">{c.slug}</p>
            </div>
            <Switch checked={c.is_active} onCheckedChange={() => toggle(c)} />
          </div>
        ))}
      </div>
    </div>
  );
}
