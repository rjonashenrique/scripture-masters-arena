import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface Announcement {
  id: string; title: string; message: string; audience: string;
  starts_at: string; ends_at: string | null; is_active: boolean;
}

const AUDIENCE: Record<string, string> = { all: 'Todos', clans: 'Membros de clãs', new: 'Novos jogadores' };

function toLocalInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function AnnouncementsTab() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '', message: '', audience: 'all',
    starts_at: toLocalInput(new Date()),
    ends_at: toLocalInput(new Date(Date.now() + 7 * 86400000)),
  });

  const load = useCallback(async () => {
    const { data } = await (supabase as any).from('system_announcements').select('*').order('created_at', { ascending: false });
    setItems((data as Announcement[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.title.trim()) return toast.error('Informe o título');
    const { error } = await (supabase as any).from('system_announcements').insert({
      title: form.title.trim(), message: form.message, audience: form.audience,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    });
    if (error) return toast.error(error.message);
    await (supabase.rpc as any)('admin_log', { p_action: 'announcement_create', p_entity_type: 'system_announcements', p_new: { title: form.title } });
    toast.success('Aviso publicado');
    setOpen(false);
    setForm({ ...form, title: '', message: '' });
    load();
  };

  const toggle = async (a: Announcement) => {
    const { error } = await (supabase as any).from('system_announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    if (error) return toast.error(error.message);
    await (supabase.rpc as any)('admin_log', { p_action: 'announcement_toggle', p_entity_type: 'system_announcements', p_entity_id: a.id, p_new: { is_active: !a.is_active } });
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground">Avisos do sistema</h2>
        <Button onClick={() => setOpen(true)}><Plus size={16} /> Novo aviso</Button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground">{a.title}</p>
              <Switch checked={a.is_active} onCheckedChange={() => toggle(a)} />
            </div>
            <p className="text-sm text-muted-foreground">{a.message}</p>
            <p className="text-[10px] text-muted-foreground">
              {AUDIENCE[a.audience] ?? a.audience} • {new Date(a.starts_at).toLocaleDateString('pt-BR')}
              {a.ends_at ? ` até ${new Date(a.ends_at).toLocaleDateString('pt-BR')}` : ''}
            </p>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum aviso criado.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo aviso</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea rows={3} placeholder="Mensagem" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIENCE).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
