import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Shield, Clock, Target, Gift, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyChallenges } from '@/hooks/useChallenges';
import { Progress } from '@/components/ui/progress';
import ClanLobby from '@/components/clan/ClanLobby';
import ClanDashboard from '@/components/clan/ClanDashboard';
import ClanRanking from '@/components/clan/ClanRanking';
import { getTierByPoints } from '@/lib/leagueUtils';
import { toast } from 'sonner';

type View = 'lobby' | 'dashboard' | 'challenges' | 'ranking';

export default function LeaguePage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('lobby');
  const [myClan, setMyClan] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [allClans, setAllClans] = useState<any[]>([]);
  const [myRole, setMyRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);

  const { challenges, loading: challengesLoading, fetchChallenges } = useWeeklyChallenges(myClan?.id || null);

  const fetchMyClan = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: membership } = await supabase
      .from('church_members')
      .select('church_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      setMyRole(membership.role);
      const { data: clan } = await supabase
        .from('churches')
        .select('*')
        .eq('id', membership.church_id)
        .single();

      if (clan) {
        const { data: stats } = await supabase.rpc('get_church_stats', { p_church_id: clan.id });
        const s = stats?.[0];
        setMyClan({
          ...clan,
          total_points: Number(s?.total_points ?? 0),
          member_count: Number(s?.member_count ?? 0),
        });

        const { data: mems } = await supabase
          .from('church_members')
          .select('user_id, points_contributed, role, profiles(display_name, total_points, avatar_url)')
          .eq('church_id', clan.id)
          .order('points_contributed', { ascending: false });

        setMembers((mems as any) || []);

        // Fetch join requests if leader/vice
        if (membership.role === 'leader' || membership.role === 'vice') {
          const { data: requests } = await supabase
            .from('clan_join_requests')
            .select('*, profiles:user_id(display_name)')
            .eq('church_id', clan.id)
            .eq('status', 'pending');
          setJoinRequests((requests as any) || []);
        }

        setView('dashboard');
      }
    }
    setLoading(false);
  }, [user]);

  const fetchAllClans = useCallback(async () => {
    const { data } = await supabase
      .from('churches')
      .select('*')
      .order('total_points', { ascending: false })
      .limit(50);

    if (data) {
      const enriched = await Promise.all(
        data.map(async (c) => {
          const { data: stats } = await supabase.rpc('get_church_stats', { p_church_id: c.id });
          const s = stats?.[0];
          return { ...c, total_points: Number(s?.total_points ?? 0), member_count: Number(s?.member_count ?? 0) };
        })
      );
      enriched.sort((a, b) => b.total_points - a.total_points);
      setAllClans(enriched);
    }
  }, []);

  useEffect(() => {
    fetchMyClan();
    fetchAllClans();
  }, [fetchMyClan, fetchAllClans]);

  const handleLeave = async () => {
    if (!user || !myClan) return;
    if (myRole === 'leader') {
      toast.error('Transfira a liderança antes de sair!');
      return;
    }
    await supabase.from('church_members').delete().eq('user_id', user.id);
    toast.success('Você saiu do clã');
    setMyClan(null);
    setMembers([]);
    setView('lobby');
    fetchAllClans();
  };

  const handleRefresh = () => {
    fetchMyClan();
    fetchAllClans();
  };

  // Challenge view helpers
  const getDaysRemaining = () => {
    if (challenges.length === 0) return 0;
    const endDate = new Date(challenges[0].week_end + 'T23:59:59');
    return Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };
  const completedCount = challenges.filter(c => c.progress?.completed).length;
  const totalReward = challenges.filter(c => c.progress?.completed).reduce((sum, c) => sum + c.reward_coins, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse">
          <Shield size={20} className="text-secondary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground">
          Liga dos <span className="text-gradient-gold">Clãs</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Compita com seu clã ⚔️</p>
      </div>

      {/* Tabs */}
      {myClan && (
        <div className="px-5 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {(['dashboard', 'challenges', 'ranking'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setView(tab); if (tab === 'ranking') fetchAllClans(); if (tab === 'challenges') fetchChallenges(); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                view === tab ? 'bg-secondary text-secondary-foreground' : 'glass-card text-muted-foreground'
              }`}
            >
              {tab === 'dashboard' ? '⚔️ Meu Clã' : tab === 'challenges' ? '🎯 Desafios' : '🏆 Ranking'}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 space-y-4">
        <AnimatePresence mode="wait">
          {view === 'lobby' && !myClan && (
            <ClanLobby allClans={allClans} onRefresh={handleRefresh} />
          )}

          {view === 'dashboard' && myClan && (
            <ClanDashboard
              clan={myClan}
              members={members}
              joinRequests={joinRequests}
              myRole={myRole}
              onRefresh={handleRefresh}
              onViewChallenges={() => { setView('challenges'); fetchChallenges(); }}
              onLeave={handleLeave}
            />
          )}

          {view === 'challenges' && myClan && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="glass-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                    <Target size={20} className="text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold font-display text-foreground">Desafios Semanais</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>{getDaysRemaining()} dias restantes</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gradient-gold">{completedCount}</p>
                      <p className="text-[10px] text-muted-foreground">Completos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground">{challenges.length}</p>
                      <p className="text-[10px] text-muted-foreground">Total</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 glass-card px-3 py-1.5">
                    <Gift size={14} className="text-secondary" />
                    <span className="text-sm font-bold text-secondary">{totalReward} moedas</span>
                  </div>
                </div>
              </div>

              {challengesLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
              ) : challenges.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={40} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">Nenhum desafio ativo</p>
                </div>
              ) : (
                challenges.map((challenge, i) => {
                  const progress = challenge.progress;
                  const currentValue = progress?.current_value || 0;
                  const percentage = Math.min(100, (currentValue / challenge.target_value) * 100);
                  const isCompleted = progress?.completed || false;

                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`glass-card p-4 ${isCompleted ? 'ring-1 ring-success/30' : ''}`}
                    >
                      {isCompleted && <div className="absolute top-2 right-2"><CheckCircle2 size={18} className="text-success" /></div>}
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{challenge.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold font-display text-foreground text-sm">{challenge.title}</p>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                        </div>
                      </div>
                      <Progress value={percentage} className={`h-2.5 ${isCompleted ? '[&>div]:bg-gradient-success' : '[&>div]:bg-gradient-gold'}`} />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{currentValue.toLocaleString()} / {challenge.target_value.toLocaleString()}</span>
                        <div className="flex items-center gap-1">
                          <Gift size={12} className="text-secondary" />
                          <span className={`text-xs font-bold ${isCompleted ? 'text-success' : 'text-secondary'}`}>
                            {isCompleted ? '✓ ' : ''}{challenge.reward_coins} moedas
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {view === 'ranking' && (
            <ClanRanking allClans={allClans} myClanId={myClan?.id || null} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
