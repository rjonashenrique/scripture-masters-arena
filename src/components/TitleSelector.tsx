import { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export default function TitleSelector() {
  const { user } = useAuth();
  const { profile, fetchProfile } = useProfile();
  const [titles, setTitles] = useState<string[]>([]);
  const [active, setActive] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('titles, active_title').eq('id', user.id).single();
      const list = Array.isArray(data?.titles) ? (data!.titles as string[]) : [];
      setTitles(list);
      setActive(data?.active_title || '');
    })();
  }, [user, profile?.id]);

  const choose = async (t: string) => {
    const { error } = await supabase.rpc('set_active_title', { p_title: t });
    if (error) { toast.error(error.message); return; }
    setActive(t);
    toast.success(t ? `Título ativo: ${t}` : 'Título removido');
    fetchProfile();
  };

  if (titles.length === 0) {
    return (
      <div className="glass-card p-4 text-center">
        <Crown className="mx-auto text-muted-foreground mb-2" size={20} />
        <p className="text-xs text-muted-foreground">Conquiste títulos vencendo torneios semanais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => choose('')}
        className={`w-full text-left p-3 rounded-xl border ${active === '' ? 'border-secondary bg-secondary/10' : 'border-border/40 glass-card'}`}
      >
        <p className="text-sm font-semibold text-foreground">Sem título</p>
      </button>
      {titles.map((t) => (
        <button
          key={t}
          onClick={() => choose(t)}
          className={`w-full text-left p-3 rounded-xl border flex items-center gap-2 ${active === t ? 'border-secondary bg-secondary/10' : 'border-border/40 glass-card'}`}
        >
          <Crown size={16} className="text-secondary" />
          <span className="text-sm font-semibold text-foreground">{t}</span>
        </button>
      ))}
    </div>
  );
}
