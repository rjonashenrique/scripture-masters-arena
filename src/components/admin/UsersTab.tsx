import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Shield, Ban, Clock, CheckCircle2 } from 'lucide-react';
import { AdminRole, ROLE_LABELS, useAdminRole } from '@/hooks/useAdminRole';

interface AdminUser {
  id: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  total_points: number;
  total_answered: number;
  coins: number;
  streak_days: number;
  status: string;
  suspended_until: string | null;
  competitive_blocked: boolean;
  admin_note: string;
  created_at: string;
  updated_at: string;
  roles: string[];
  clan_name: string | null;
  clan_role: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo', suspended: 'Suspenso', banned: 'Banido',
};

const ALL_ROLES: AdminRole[] = ['super_admin', 'admin', 'moderator', 'editor'];

export default function UsersTab() {
  const { isSuperAdmin, canManageUsers } = useAdminRole();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)('admin_list_users', {
      p_search: search, p_status: status, p_role: role, p_limit: 200,
    });
    if (error) toast.error('Erro ao carregar jogadores');
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  }, [search, status, role]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, e-mail ou ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas situações</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="banned">Banidos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            {ALL_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3">Jogador</th>
              <th className="p-3 hidden md:table-cell">E-mail</th>
              <th className="p-3">Pontos</th>
              <th className="p-3 hidden lg:table-cell">Clã</th>
              <th className="p-3 hidden lg:table-cell">Cadastro</th>
              <th className="p-3">Situação</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/50 last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs overflow-hidden shrink-0">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (u.display_name || '?').slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{u.display_name || 'Sem nome'}</p>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r) => (
                          <Badge key={r} variant="secondary" className="text-[9px] px-1 py-0">{ROLE_LABELS[r as AdminRole] ?? r}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 hidden md:table-cell text-muted-foreground truncate max-w-[200px]">{u.email ?? '—'}</td>
                <td className="p-3 text-foreground">{u.total_points.toLocaleString('pt-BR')}</td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground">{u.clan_name ?? '—'}</td>
                <td className="p-3 hidden lg:table-cell text-muted-foreground">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">
                  <Badge variant={u.status === 'active' ? 'outline' : 'destructive'}>{STATUS_LABEL[u.status] ?? u.status}</Badge>
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(u)}>Abrir</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center">Nenhum jogador encontrado.</p>
        )}
        {loading && <p className="text-sm text-muted-foreground py-10 text-center">Carregando...</p>}
      </div>

      {selected && (
        <UserDialog
          user={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
          isSuperAdmin={isSuperAdmin}
          canModerate={canManageUsers}
        />
      )}
    </div>
  );
}

function UserDialog({ user, onClose, onSaved, isSuperAdmin, canModerate }: {
  user: AdminUser; onClose: () => void; onSaved: () => void; isSuperAdmin: boolean; canModerate: boolean;
}) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('7');
  const [note, setNote] = useState(user.admin_note ?? '');
  const [blocked, setBlocked] = useState(user.competitive_blocked);
  const [busy, setBusy] = useState(false);

  const accuracy = user.total_answered > 0
    ? ((user.total_points / Math.max(user.total_answered, 1))).toFixed(1) : '0';

  const act = async (newStatus: string) => {
    if (newStatus !== 'active' && !reason.trim()) return toast.error('Informe o motivo da ação');
    setBusy(true);
    const { error } = await (supabase.rpc as any)('admin_set_user_status', {
      p_user_id: user.id,
      p_status: newStatus,
      p_reason: reason,
      p_days: newStatus === 'suspended' ? parseInt(days, 10) || 7 : null,
      p_competitive_blocked: blocked,
      p_note: note,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Ação registrada');
    onSaved();
  };

  const toggleRole = async (r: AdminRole, grant: boolean) => {
    const { error } = await (supabase.rpc as any)('admin_set_role', { p_user_id: user.id, p_role: r, p_grant: grant });
    if (error) return toast.error(error.message);
    toast.success(grant ? 'Papel concedido' : 'Papel removido');
    onSaved();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Perfil administrativo</DialogTitle></DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Info label="Nome" value={user.display_name || 'Sem nome'} />
            <Info label="E-mail" value={user.email ?? '—'} />
            <Info label="ID" value={user.id.slice(0, 8) + '…'} />
            <Info label="Pontos" value={user.total_points.toLocaleString('pt-BR')} />
            <Info label="Moedas" value={String(user.coins)} />
            <Info label="Respostas" value={String(user.total_answered)} />
            <Info label="Média por resposta" value={accuracy} />
            <Info label="Streak" value={`${user.streak_days} dias`} />
            <Info label="Clã" value={user.clan_name ? `${user.clan_name} (${user.clan_role})` : '—'} />
            <Info label="Cadastro" value={new Date(user.created_at).toLocaleDateString('pt-BR')} />
            <Info label="Último acesso" value={new Date(user.updated_at).toLocaleDateString('pt-BR')} />
            <Info label="Situação" value={STATUS_LABEL[user.status] ?? user.status} />
          </div>

          {isSuperAdmin && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-1"><Shield size={14} /> Papéis</p>
              <div className="flex flex-wrap gap-3">
                {ALL_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-xs">
                    <Switch checked={user.roles.includes(r)} onCheckedChange={(v) => toggleRole(r, v)} />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
            </div>
          )}

          {canModerate && (
            <div className="rounded-lg border border-border p-3 space-y-3">
              <p className="font-semibold text-foreground">Ações administrativas</p>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={blocked} onCheckedChange={setBlocked} />
                Bloquear modos competitivos
              </label>
              <Textarea placeholder="Observação administrativa" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
              <Textarea placeholder="Motivo da ação (obrigatório para suspender/banir)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
              <div className="flex flex-wrap items-center gap-2">
                <Input className="w-24" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act('suspended')}>
                  <Clock size={14} /> Suspender
                </Button>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('banned')}>
                  <Ban size={14} /> Banir
                </Button>
                <Button size="sm" disabled={busy} onClick={() => act('active')}>
                  <CheckCircle2 size={14} /> Reativar / salvar
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-foreground font-medium truncate">{value}</p>
    </div>
  );
}
