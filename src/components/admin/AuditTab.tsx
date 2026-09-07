import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface AuditLog {
  id: string; admin_name: string; action: string; entity_type: string; entity_id: string | null;
  reason: string | null; old_value: unknown; new_value: unknown; created_at: string;
}

export default function AuditTab() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(300);
    setItems((data as AuditLog[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) =>
    `${i.admin_name} ${i.action} ${i.entity_type} ${i.entity_id ?? ''} ${i.reason ?? ''}`
      .toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p className="text-sm text-muted-foreground py-10 text-center">Carregando auditoria...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Auditoria</h2>
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar ação, admin ou entidade..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((l) => (
          <div key={l.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{l.action}</Badge>
              <span className="text-foreground font-medium">{l.admin_name || 'Admin'}</span>
              <span className="text-muted-foreground">→ {l.entity_type}{l.entity_id ? ` #${l.entity_id.slice(0, 8)}` : ''}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{new Date(l.created_at).toLocaleString('pt-BR')}</span>
            </div>
            {l.reason && <p className="text-xs text-muted-foreground mt-1">Motivo: {l.reason}</p>}
            {(l.old_value || l.new_value) && (
              <div className="grid md:grid-cols-2 gap-2 mt-2 text-[10px] text-muted-foreground">
                <pre className="rounded bg-muted p-2 overflow-x-auto">antes: {JSON.stringify(l.old_value)}</pre>
                <pre className="rounded bg-muted p-2 overflow-x-auto">depois: {JSON.stringify(l.new_value)}</pre>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum registro.</p>}
      </div>
    </div>
  );
}
