import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, ShieldOff, Search } from 'lucide-react';

interface AdminProfile {
  id: string;
  display_name: string;
  total_points: number;
  coins: number;
  total_answered: number;
}

export default function UsersTab() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, total_points, coins, total_answered')
        .order('total_points', { ascending: false })
        .limit(200),
      supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
    ]);
    setProfiles((profs as AdminProfile[]) ?? []);
    setAdminIds(new Set((roles ?? []).map((r: { user_id: string }) => r.user_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const adjust = async (id: string, field: 'coins' | 'total_points', current: number) => {
    const input = window.prompt(`Novo valor para ${field === 'coins' ? 'moedas' : 'pontos'}:`, String(current));
    if (input === null) return;
    const value = parseInt(input, 10);
    if (isNaN(value) || value < 0) return toast.error('Valor inválido');
    const update = field === 'coins' ? { coins: value } : { total_points: value };
    const { error } = await supabase.from('profiles').update(update).eq('id', id);
    if (error) return toast.error('Erro ao atualizar');
    toast.success('Atualizado');
    load();
  };

  const toggleAdmin = async (id: string, isAdmin: boolean) => {
    if (isAdmin) {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', id).eq('role', 'admin');
      if (error) return toast.error('Erro ao remover admin');
      toast.success('Admin removido');
    } else {
      const { error } = await supabase.from('user_roles').insert({ user_id: id, role: 'admin' } as any);
      if (error) return toast.error('Erro ao tornar admin');
      toast.success('Agora é admin');
    }
    load();
  };

  const filtered = profiles.filter((p) =>
    (p.display_name || '').toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <p className="text-sm text-muted-foreground py-8 text-center">Carregando jogadores...</p>;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {filtered.map((p) => {
        const isAdmin = adminIds.has(p.id);
        return (
          <div key={p.id} className="glass-card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate flex items-center gap-1">
                  {p.display_name || 'Sem nome'}
                  {isAdmin && <Shield size={12} className="text-secondary shrink-0" />}
                </p>
                <p className="text-[10px] text-muted-foreground">{p.total_answered} respostas</p>
              </div>
              <Button
                variant={isAdmin ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => toggleAdmin(p.id, isAdmin)}
              >
                {isAdmin ? <ShieldOff size={14} /> : <Shield size={14} />}
              </Button>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => adjust(p.id, 'total_points', p.total_points)}
                className="flex-1 text-xs glass-card py-1.5 active:scale-95 transition-transform"
              >
                Pontos: <span className="font-bold text-foreground">{p.total_points}</span>
              </button>
              <button
                onClick={() => adjust(p.id, 'coins', p.coins)}
                className="flex-1 text-xs glass-card py-1.5 active:scale-95 transition-transform"
              >
                Moedas: <span className="font-bold text-foreground">{p.coins}</span>
              </button>
            </div>
          </div>
        );
      })}
      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhum jogador encontrado.</p>
      )}
    </div>
  );
}
