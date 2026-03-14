import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, LogOut, Users, Trophy, Star, Target, Gift, Crown, Shield, UserMinus, UserPlus, ArrowRightLeft, Trash2, ChevronRight, Clock, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyChallenges } from '@/hooks/useChallenges';
import { getTierByPoints, getNextTier } from '@/lib/leagueUtils';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface MemberData {
  user_id: string;
  points_contributed: number;
  role: string;
  profiles: {
    display_name: string;
    total_points: number;
    avatar_url: string | null;
  };
}

interface JoinRequest {
  id: string;
  user_id: string;
  created_at: string;
  profiles?: { display_name: string };
}

interface ClanDashboardProps {
  clan: any;
  members: MemberData[];
  joinRequests: JoinRequest[];
  myRole: string;
  onRefresh: () => void;
  onViewChallenges: () => void;
  onLeave: () => void;
}

export default function ClanDashboard({ clan, members, joinRequests, myRole, onRefresh, onViewChallenges, onLeave }: ClanDashboardProps) {
  const { user } = useAuth();
  const [showMembers, setShowMembers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { challenges } = useWeeklyChallenges(clan?.id || null);

  const tier = getTierByPoints(clan.total_points);
  const nextTier = getNextTier(tier.id);
  const isLeader = myRole === 'leader';
  const isVice = myRole === 'vice';
  const canManage = isLeader || isVice;

  const completedCount = challenges.filter(c => c.progress?.completed).length;

  const getDaysRemaining = () => {
    if (challenges.length === 0) return 0;
    const endDate = new Date(challenges[0].week_end + 'T23:59:59');
    return Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const copyCode = () => {
    navigator.clipboard.writeText(clan.code);
    toast.success('Código copiado!');
  };

  const handleAcceptRequest = async (requestId: string) => {
    const { error } = await supabase.rpc('accept_join_request', { p_request_id: requestId });
    if (error) { toast.error(error.message); return; }
    toast.success('Membro aceito!');
    onRefresh();
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase.rpc('reject_join_request', { p_request_id: requestId });
    if (error) { toast.error(error.message); return; }
    toast.success('Pedido rejeitado');
    onRefresh();
  };

  const handleKick = async (targetId: string) => {
    const { error } = await supabase.rpc('kick_clan_member', { p_church_id: clan.id, p_target_user_id: targetId });
    if (error) { toast.error(error.message); return; }
    toast.success('Membro removido');
    setShowActions(null);
    onRefresh();
  };

  const handleSetRole = async (targetId: string, role: string) => {
    const { error } = await supabase.rpc('set_member_role', { p_church_id: clan.id, p_target_user_id: targetId, p_role: role });
    if (error) { toast.error(error.message); return; }
    toast.success(role === 'vice' ? 'Promovido a vice-líder!' : 'Rebaixado a membro');
    setShowActions(null);
    onRefresh();
  };

  const handleTransferLeadership = async (targetId: string) => {
    const { error } = await supabase.rpc('transfer_clan_leadership', { p_church_id: clan.id, p_new_leader_id: targetId });
    if (error) { toast.error(error.message); return; }
    toast.success('Liderança transferida!');
    setShowActions(null);
    onRefresh();
  };

  const handleDeleteClan = async () => {
    const { error } = await supabase.rpc('delete_clan', { p_church_id: clan.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Clã excluído');
    onLeave();
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Crown size={14} className="text-secondary" />;
      case 'vice': return <Shield size={14} className="text-primary" />;
      default: return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'leader': return 'Líder';
      case 'vice': return 'Vice';
      default: return 'Membro';
    }
  };

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Clan info card */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{tier.icon}</span>
              <h2 className="text-xl font-extrabold font-display text-foreground truncate">{clan.name}</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${tier.gradient} text-foreground`}>
                {tier.name}
              </span>
              {clan.denomination && <span className="text-[10px] text-muted-foreground">{clan.denomination}</span>}
            </div>
            {clan.description && <p className="text-xs text-muted-foreground mt-2">{clan.description}</p>}
          </div>
          <button onClick={copyCode} className="glass-card px-3 py-1.5 flex items-center gap-1.5 shrink-0">
            <Copy size={12} className="text-muted-foreground" />
            <span className="text-xs font-mono font-bold text-secondary">{clan.code}</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <Trophy size={14} className="text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-gradient-gold">{clan.total_points.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Pontos</p>
          </div>
          <div className="text-center">
            <Users size={14} className="text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{members.length}/{clan.max_members || 20}</p>
            <p className="text-[10px] text-muted-foreground">Membros</p>
          </div>
          <div className="text-center">
            <Star size={14} className="text-secondary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{members.length > 0 ? Math.round(clan.total_points / members.length) : 0}</p>
            <p className="text-[10px] text-muted-foreground">Média</p>
          </div>
        </div>

        {/* League progress */}
        {nextTier && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-muted-foreground">{tier.icon} {tier.name}</span>
              <span className="text-[10px] text-muted-foreground">{nextTier.icon} {nextTier.name}</span>
            </div>
            <Progress
              value={Math.min(100, ((clan.total_points - tier.minPoints) / (nextTier.minPoints - tier.minPoints)) * 100)}
              className="h-2 [&>div]:bg-gradient-gold"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              {(nextTier.minPoints - clan.total_points).toLocaleString()} pts para {nextTier.name}
            </p>
          </div>
        )}
      </div>

      {/* Join requests */}
      {canManage && joinRequests.length > 0 && (
        <button
          onClick={() => setShowRequests(!showRequests)}
          className="w-full glass-card p-4 flex items-center gap-3 text-left ring-1 ring-secondary/30"
        >
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center relative">
            <Bell size={20} className="text-secondary" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
              {joinRequests.length}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-bold font-display text-foreground">Pedidos de Entrada</p>
            <p className="text-xs text-muted-foreground">{joinRequests.length} pendentes</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      )}

      {showRequests && joinRequests.map((req) => (
        <motion.div key={req.id} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
            {((req as any).profiles?.display_name || '?')[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{(req as any).profiles?.display_name || 'Jogador'}</p>
            <p className="text-[10px] text-muted-foreground">{new Date(req.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => handleAcceptRequest(req.id)} className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <UserPlus size={14} className="text-success" />
            </button>
            <button onClick={() => handleRejectRequest(req.id)} className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
              <UserMinus size={14} className="text-destructive" />
            </button>
          </div>
        </motion.div>
      ))}

      {/* Challenges preview */}
      {challenges.length > 0 && (
        <button onClick={onViewChallenges} className="w-full glass-card p-4 flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
            <Target size={20} className="text-secondary-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-bold font-display text-foreground">Desafios Semanais</p>
            <p className="text-xs text-muted-foreground">{completedCount}/{challenges.length} completos · {getDaysRemaining()} dias</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      )}

      {/* Members */}
      <div>
        <button onClick={() => setShowMembers(!showMembers)} className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-secondary" />
          <h3 className="font-bold font-display text-foreground">Membros ({members.length})</h3>
          <ChevronRight size={14} className={`text-muted-foreground transition-transform ${showMembers ? 'rotate-90' : ''}`} />
        </button>

        {showMembers && members.map((m, i) => (
          <motion.div
            key={m.user_id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`glass-card p-3 mb-2 flex items-center gap-3 ${m.user_id === user?.id ? 'ring-1 ring-secondary/30' : ''}`}
          >
            <span className="w-7 text-center text-xs font-bold text-muted-foreground">{i + 1}º</span>
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {(m.profiles?.display_name || '?')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {getRoleIcon(m.role)}
                <p className="text-sm font-semibold text-foreground truncate">
                  {m.profiles?.display_name || 'Jogador'}
                  {m.user_id === user?.id && <span className="text-[10px] text-secondary ml-1">(você)</span>}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground">{getRoleLabel(m.role)}</p>
            </div>
            <span className="text-xs font-bold text-gradient-gold shrink-0">
              {(m.profiles?.total_points || 0).toLocaleString()}
            </span>

            {/* Member actions (leader only, not on self) */}
            {isLeader && m.user_id !== user?.id && (
              <div className="relative">
                <button onClick={() => setShowActions(showActions === m.user_id ? null : m.user_id)} className="w-6 h-6 flex items-center justify-center text-muted-foreground">⋮</button>
                {showActions === m.user_id && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-0 top-8 z-50 glass-card p-2 space-y-1 min-w-[160px]">
                    {m.role !== 'vice' && (
                      <button onClick={() => handleSetRole(m.user_id, 'vice')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted">
                        <Shield size={12} /> Promover a Vice
                      </button>
                    )}
                    {m.role === 'vice' && (
                      <button onClick={() => handleSetRole(m.user_id, 'member')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted">
                        <Users size={12} /> Rebaixar a Membro
                      </button>
                    )}
                    <button onClick={() => handleTransferLeadership(m.user_id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-secondary hover:bg-muted">
                      <ArrowRightLeft size={12} /> Transferir Liderança
                    </button>
                    <button onClick={() => handleKick(m.user_id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-muted">
                      <UserMinus size={12} /> Expulsar
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="space-y-2 pb-4">
        {isLeader && (
          <>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="w-full glass-card p-3 flex items-center justify-center gap-2 text-destructive text-sm font-semibold">
                <Trash2 size={16} /> Excluir Clã
              </button>
            ) : (
              <div className="glass-card p-4 space-y-3">
                <p className="text-sm text-foreground text-center font-semibold">Tem certeza? Isso é irreversível!</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 glass-card py-2.5 rounded-xl text-sm font-semibold text-muted-foreground">Cancelar</button>
                  <button onClick={handleDeleteClan} className="flex-1 bg-destructive text-destructive-foreground py-2.5 rounded-xl text-sm font-bold">Excluir</button>
                </div>
              </div>
            )}
          </>
        )}
        <button onClick={onLeave} className="w-full glass-card p-3 flex items-center justify-center gap-2 text-destructive/70 text-sm font-semibold">
          <LogOut size={16} /> Sair do Clã
        </button>
      </div>
    </motion.div>
  );
}
