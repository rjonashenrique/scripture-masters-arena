import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Church, Trophy, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { getTierByPoints } from '@/lib/leagueUtils';
import { toast } from 'sonner';

interface ClanLobbyProps {
  allClans: any[];
  onRefresh: () => void;
}

export default function ClanLobby({ allClans, onRefresh }: ClanLobbyProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [showCreate, setShowCreate] = useState(false);
  const [clanName, setClanName] = useState('');
  const [denomination, setDenomination] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreate = async () => {
    if (!user || !clanName.trim()) return;
    const code = generateCode();

    const { data, error } = await supabase
      .from('churches')
      .insert({
        name: clanName.trim(),
        denomination: denomination.trim(),
        description: description.trim(),
        code,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) { toast.error('Erro ao criar clã'); return; }

    await supabase
      .from('church_members')
      .insert({ church_id: data.id, user_id: user.id, role: 'leader', points_contributed: profile?.total_points || 0 });

    toast.success('Clã criado com sucesso!');
    setShowCreate(false);
    setClanName('');
    setDenomination('');
    setDescription('');
    onRefresh();
  };

  const handleJoinByCode = async () => {
    if (!user || !joinCode.trim()) return;

    const { data: clan } = await supabase
      .from('churches')
      .select('*')
      .eq('code', joinCode.trim().toUpperCase())
      .single();

    if (!clan) { toast.error('Código não encontrado'); return; }

    // Send join request instead of directly joining
    const { error } = await supabase
      .from('clan_join_requests')
      .insert({ church_id: clan.id, user_id: user.id });

    if (error) {
      if (error.code === '23505') toast.error('Você já enviou um pedido para este clã');
      else toast.error('Erro ao enviar pedido');
      return;
    }

    toast.success('Pedido enviado! Aguarde aprovação do líder.');
    setJoinCode('');
  };

  const handleRequestJoin = async (clanId: string) => {
    if (!user) return;
    setRequestingId(clanId);

    const { error } = await supabase
      .from('clan_join_requests')
      .insert({ church_id: clanId, user_id: user.id });

    if (error) {
      if (error.code === '23505') toast.error('Pedido já enviado');
      else toast.error('Erro ao enviar pedido');
    } else {
      toast.success('Pedido enviado!');
    }
    setRequestingId(null);
  };

  return (
    <motion.div
      key="lobby"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Join by code */}
      <div className="glass-card p-5">
        <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2">
          <Search size={18} className="text-secondary" />
          Entrar por Código
        </h3>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Código do clã"
            maxLength={6}
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 uppercase tracking-widest text-center font-mono"
          />
          <button
            onClick={handleJoinByCode}
            disabled={joinCode.length < 4}
            className="bg-gradient-gold text-secondary-foreground px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            Pedir
          </button>
        </div>
      </div>

      {/* Create clan */}
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)} className="w-full glass-card p-5 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Plus size={20} className="text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold font-display text-foreground">Criar Clã</p>
            <p className="text-xs text-muted-foreground">Monte seu time e compita nas ligas</p>
          </div>
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 space-y-3">
          <h3 className="font-bold font-display text-foreground flex items-center gap-2">
            <Shield size={18} className="text-secondary" />
            Novo Clã
          </h3>
          <input value={clanName} onChange={(e) => setClanName(e.target.value)} placeholder="Nome do clã" maxLength={30}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
          <input value={denomination} onChange={(e) => setDenomination(e.target.value)} placeholder="Denominação (ex: Batista)"
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do clã (opcional)" rows={2} maxLength={150}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 glass-card py-2.5 rounded-xl text-sm font-semibold text-muted-foreground">Cancelar</button>
            <button onClick={handleCreate} disabled={!clanName.trim()} className="flex-1 bg-gradient-gold text-secondary-foreground py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">Criar</button>
          </div>
        </motion.div>
      )}

      {/* Top clans list */}
      {allClans.length > 0 && (
        <div>
          <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-secondary" />
            Top Clãs
          </h3>
          {allClans.slice(0, 10).map((c, i) => {
            const tier = getTierByPoints(c.total_points);
            return (
              <div key={c.id} className="glass-card p-3 mb-2 flex items-center gap-3">
                <span className="w-7 text-center font-bold text-sm text-muted-foreground">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {tier.icon} {c.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {tier.name} · {c.member_count}/{c.max_members || 20} membros
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-gradient-gold">{c.total_points.toLocaleString()}</span>
                  <button
                    onClick={() => handleRequestJoin(c.id)}
                    disabled={requestingId === c.id}
                    className="text-[10px] bg-secondary/20 text-secondary px-2 py-1 rounded-lg font-semibold"
                  >
                    Pedir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
