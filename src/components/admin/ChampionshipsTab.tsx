import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Trophy, Calendar } from 'lucide-react';

interface Championship {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize_coins_1st: number;
  prize_coins_2nd: number;
  prize_coins_3rd: number;
}

interface Tournament {
  id: string;
  season_number: number;
  status: string;
  start_date: string;
  bracket_size: number;
}

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function ChampionshipsTab() {
  const [champs, setChamps] = useState<Championship[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 86400000);
  const [form, setForm] = useState({
    name: '',
    description: '',
    start_date: toLocalInput(now),
    end_date: toLocalInput(weekLater),
    prize_coins_1st: 500,
    prize_coins_2nd: 300,
    prize_coins_3rd: 150,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: t }] = await Promise.all([
      supabase.from('championships').select('*').order('start_date', { ascending: false }).limit(50),
      supabase.from('tournaments').select('id, season_number, status, start_date, bracket_size').order('season_number', { ascending: false }).limit(50),
    ]);
    setChamps((c as Championship[]) ?? []);
    setTournaments((t as Tournament[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.name.trim()) return toast.error('Informe o nome');
    const { error } = await supabase.from('championships').insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      prize_coins_1st: form.prize_coins_1st,
      prize_coins_2nd: form.prize_coins_2nd,
      prize_coins_3rd: form.prize_coins_3rd,
    } as any);
    if (error) return toast.error('Erro ao criar');
    toast.success('Campeonato criado');
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Excluir este campeonato?')) return;
    const { error } = await supabase.from('championships').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    toast.success('Excluído');
    load();
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>;

  return (
    <div className="space-y-4">
      <Button onClick={() => setOpen(true)} size="sm" className="w-full">
        <Plus size={14} /> Novo campeonato
      </Button>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
          <Trophy size={14} className="text-secondary" /> Campeonatos
        </h3>
        {champs.length === 0 && <p className="text-xs text-muted-foreground">Nenhum campeonato.</p>}
        {champs.map((c) => (
          <div key={c.id} className="glass-card p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">{fmt(c.start_date)} → {fmt(c.end_date)}</p>
              <p className="text-[10px] text-secondary">🥇 {c.prize_coins_1st} · 🥈 {c.prize_coins_2nd} · 🥉 {c.prize_coins_3rd}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(c.id)}>
              <Trash2 size={14} className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
          <Calendar size={14} className="text-primary" /> Torneios
        </h3>
        {tournaments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum torneio.</p>}
        {tournaments.map((t) => (
          <div key={t.id} className="glass-card p-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-foreground">Temporada {t.season_number}</p>
              <p className="text-[10px] text-muted-foreground">{fmt(t.start_date)} • {t.bracket_size} jogadores</p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-foreground capitalize">{t.status}</span>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo campeonato</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">Início</label>
                <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Fim</label>
                <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([['prize_coins_1st', '🥇'], ['prize_coins_2nd', '🥈'], ['prize_coins_3rd', '🥉']] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="text-[10px] text-muted-foreground">{label} moedas</label>
                  <Input
                    type="number"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={create}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
