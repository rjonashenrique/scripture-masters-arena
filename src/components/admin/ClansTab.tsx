import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, ShieldOff, ShieldCheck, ImageOff } from 'lucide-react';

interface AdminClan {
  id: string; name: string; tag: string; emblem: string; avatar_url: string | null; description: string;
  league: string; level: number; xp: number; member_count: number; max_members: number;
  is_active: boolean; visibility: string; created_at: string; leader_name: string | null;
}

interface Member { user_id: string; display_name: string; role: string; xp_contributed: number }

export default function ClansTab() {
  const [clans, setClans] = useState<AdminClan[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminClan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('admin_list_clans', { p_search: search, p_limit: 200 });
    if (error) toast.error('Erro ao carregar clãs');
    setClans((data as AdminClan[]) ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Liga de Clãs Bíblicos</h2>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou tag..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3">Clã</th>
              <th className="p-3 hidden md:table-cell">Líder</th>
              <th className="p-3">Membros</th>
              <th className="p-3 hidden lg:table-cell">Nível</th>
              <th className="p-3 hidden lg:table-cell">Liga</th>
              <th className="p-3">XP</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {clans.map((c) => (
              <tr key={c.id} className="border-b border-border/50 last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{c.emblem}</span>
                    <div>
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">[{c.tag}]</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground">{c.leader_name ?? '—'}</td>
                <td className="p-3">{c.member_count}/{c.max_members}</td>
                <td className="p-3 hidden lg:table-cell">{c.level}</td>
                <td className="p-3 hidden lg:table-cell capitalize">{c.league}</td>
                <td className="p-3">{c.xp.toLocaleString('pt-BR')}</td>
                <td className="p-3"><Badge variant={c.is_active ? 'outline' : 'destructive'}>{c.is_active ? 'Ativo' : 'Suspenso'}</Badge></td>
                <td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => setSelected(c)}>Abrir</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>}
        {!loading && clans.length === 0 && <p className="text-sm text-muted-foreground py-10 text-center">Nenhum clã encontrado.</p>}
      </div>

      {selected && <ClanDialog clan={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); load(); }} />}
    </div>
  );
}

function ClanDialog({ clan, onClose, onSaved }: { clan: AdminClan; onClose: () => void; onSaved: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState(clan.description ?? '');

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('clan_members')
        .select('user_id, display_name, role, xp_contributed')
        .eq('clan_id', clan.id)
        .order('xp_contributed', { ascending: false });
      setMembers((data as Member[]) ?? []);
    })();
  }, [clan.id]);

  const setStatus = async (active: boolean) => {
    if (!reason.trim()) return toast.error('Informe o motivo');
    const { error } = await (supabase.rpc as any)('admin_set_clan_status', { p_clan_id: clan.id, p_active: active, p_reason: reason });
    if (error) return toast.error(error.message);
    toast.success('Ação registrada');
    onSaved();
  };

  const clean = async (clearAvatar: boolean) => {
    if (!reason.trim()) return toast.error('Informe o motivo');
    const { error } = await (supabase.rpc as any)('admin_clean_clan', {
      p_clan_id: clan.id, p_clear_avatar: clearAvatar, p_description: description, p_reason: reason,
    });
    if (error) return toast.error(error.message);
    toast.success('Dados atualizados');
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{clan.emblem} {clan.name} [{clan.tag}]</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[['Nível', clan.level], ['Liga', clan.league], ['XP', clan.xp], ['Membros', `${clan.member_count}/${clan.max_members}`],
              ['Visibilidade', clan.visibility], ['Criado em', new Date(clan.created_at).toLocaleDateString('pt-BR')]].map(([l, v]) => (
              <div key={String(l)} className="rounded-lg border border-border p-2">
                <p className="text-[10px] text-muted-foreground">{l}</p>
                <p className="text-foreground font-medium capitalize">{String(v)}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="font-semibold text-foreground mb-2">Membros e cargos</p>
            <div className="rounded-lg border border-border divide-y divide-border">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center justify-between p-2">
                  <span className="text-foreground">{m.display_name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{m.role} • {m.xp_contributed} XP</span>
                </div>
              ))}
              {members.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhum membro.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <p className="font-semibold text-foreground">Ações administrativas</p>
            <Textarea rows={2} placeholder="Descrição do clã" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Textarea rows={2} placeholder="Motivo (obrigatório)" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => clean(false)}>Salvar descrição</Button>
              <Button size="sm" variant="outline" onClick={() => clean(true)}><ImageOff size={14} /> Remover brasão</Button>
              {clan.is_active
                ? <Button size="sm" variant="destructive" onClick={() => setStatus(false)}><ShieldOff size={14} /> Suspender clã</Button>
                : <Button size="sm" onClick={() => setStatus(true)}><ShieldCheck size={14} /> Reativar clã</Button>}
            </div>
            <p className="text-[10px] text-muted-foreground">O XP do clã não pode ser alterado manualmente. Toda ação fica registrada na auditoria.</p>
          </div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
