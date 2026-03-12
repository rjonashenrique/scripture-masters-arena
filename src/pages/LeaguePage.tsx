import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Church, Users, Trophy, Copy, LogOut, Plus, Search, Crown, Medal, Star, Target, Gift, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useWeeklyChallenges } from '@/hooks/useChallenges';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface ChurchData {
  id: string;
  name: string;
  denomination: string;
  code: string;
  owner_id: string;
  member_count: number;
  total_points: number;
}

interface MemberData {
  user_id: string;
  points_contributed: number;
  profiles: {
    display_name: string;
    total_points: number;
    avatar_url: string | null;
  };
}

type View = 'lobby' | 'dashboard' | 'challenges' | 'ranking';

export default function LeaguePage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [view, setView] = useState<View>('lobby');
  const [myChurch, setMyChurch] = useState<ChurchData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [allChurches, setAllChurches] = useState<ChurchData[]>([]);
  const [loading, setLoading] = useState(true);

  const { challenges, loading: challengesLoading, fetchChallenges } = useWeeklyChallenges(myChurch?.id || null);

  // Create church form
  const [showCreate, setShowCreate] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [denomination, setDenomination] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const fetchMyChurch = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: membership } = await supabase
      .from('church_members')
      .select('church_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      const { data: church } = await supabase
        .from('churches')
        .select('*')
        .eq('id', membership.church_id)
        .single();

      if (church) {
        const { data: stats } = await supabase.rpc('get_church_stats', { p_church_id: church.id });
        const s = stats?.[0];
        setMyChurch({
          ...church,
          total_points: Number(s?.total_points ?? 0),
          member_count: Number(s?.member_count ?? 0),
        });

        const { data: mems } = await supabase
          .from('church_members')
          .select('user_id, points_contributed, profiles(display_name, total_points, avatar_url)')
          .eq('church_id', church.id)
          .order('points_contributed', { ascending: false });

        setMembers((mems as any) || []);
        setView('dashboard');
      }
    }

    setLoading(false);
  }, [user]);

  const fetchAllChurches = useCallback(async () => {
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
          return {
            ...c,
            total_points: Number(s?.total_points ?? 0),
            member_count: Number(s?.member_count ?? 0),
          };
        })
      );
      enriched.sort((a, b) => b.total_points - a.total_points);
      setAllChurches(enriched);
    }
  }, []);

  useEffect(() => {
    fetchMyChurch();
    fetchAllChurches();
  }, [fetchMyChurch, fetchAllChurches]);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreate = async () => {
    if (!user || !churchName.trim()) return;
    const code = generateCode();

    const { data, error } = await supabase
      .from('churches')
      .insert({ name: churchName.trim(), denomination: denomination.trim(), code, owner_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error('Erro ao criar igreja');
      return;
    }

    await supabase
      .from('church_members')
      .insert({ church_id: data.id, user_id: user.id, points_contributed: profile?.total_points || 0 });

    toast.success('Igreja criada!');
    setShowCreate(false);
    setChurchName('');
    setDenomination('');
    fetchMyChurch();
    fetchAllChurches();
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) return;

    const { data: church, error } = await supabase
      .from('churches')
      .select('*')
      .eq('code', joinCode.trim().toUpperCase())
      .single();

    if (error || !church) {
      toast.error('Código não encontrado');
      return;
    }

    const { error: joinError } = await supabase
      .from('church_members')
      .insert({ church_id: church.id, user_id: user.id, points_contributed: profile?.total_points || 0 });

    if (joinError) {
      if (joinError.code === '23505') {
        toast.error('Você já está em uma igreja');
      } else {
        toast.error('Erro ao entrar na igreja');
      }
      return;
    }

    toast.success(`Você entrou em ${church.name}!`);
    setJoinCode('');
    fetchMyChurch();
    fetchAllChurches();
  };

  const handleLeave = async () => {
    if (!user || !myChurch) return;

    await supabase
      .from('church_members')
      .delete()
      .eq('user_id', user.id);

    toast.success('Você saiu da igreja');
    setMyChurch(null);
    setMembers([]);
    setView('lobby');
    fetchAllChurches();
  };

  const copyCode = () => {
    if (myChurch) {
      navigator.clipboard.writeText(myChurch.code);
      toast.success('Código copiado!');
    }
  };

  // Calculate days remaining in week
  const getDaysRemaining = () => {
    if (challenges.length === 0) return 0;
    const endDate = new Date(challenges[0].week_end + 'T23:59:59');
    const now = new Date();
    return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const completedCount = challenges.filter(c => c.progress?.completed).length;
  const totalReward = challenges
    .filter(c => c.progress?.completed)
    .reduce((sum, c) => sum + c.reward_coins, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center animate-pulse">
          <Church size={20} className="text-secondary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground">
          Liga das <span className="text-gradient-gold">Igrejas</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Compita com sua comunidade ⛪</p>
      </div>

      {/* Tabs */}
      {myChurch && (
        <div className="px-5 mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {(['dashboard', 'challenges', 'ranking'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setView(tab); if (tab === 'ranking') fetchAllChurches(); if (tab === 'challenges') fetchChallenges(); }}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
                view === tab
                  ? 'bg-secondary text-secondary-foreground'
                  : 'glass-card text-muted-foreground'
              }`}
            >
              {tab === 'dashboard' ? 'Minha Igreja' : tab === 'challenges' ? '🎯 Desafios' : 'Ranking'}
            </button>
          ))}
        </div>
      )}

      <div className="px-5 space-y-4">
        <AnimatePresence mode="wait">
          {/* LOBBY */}
          {view === 'lobby' && !myChurch && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="glass-card p-5">
                <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2">
                  <Search size={18} className="text-secondary" />
                  Entrar em uma Igreja
                </h3>
                <div className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Código da igreja"
                    maxLength={6}
                    className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 uppercase tracking-widest text-center font-mono"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={joinCode.length < 4}
                    className="bg-gradient-gold text-secondary-foreground px-5 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                  >
                    Entrar
                  </button>
                </div>
              </div>

              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full glass-card p-5 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
                    <Plus size={20} className="text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-bold font-display text-foreground">Criar Igreja</p>
                    <p className="text-xs text-muted-foreground">Monte seu time e compita</p>
                  </div>
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-5 space-y-3"
                >
                  <h3 className="font-bold font-display text-foreground flex items-center gap-2">
                    <Church size={18} className="text-secondary" />
                    Nova Igreja
                  </h3>
                  <input
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Nome da igreja"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                  <input
                    value={denomination}
                    onChange={(e) => setDenomination(e.target.value)}
                    placeholder="Denominação (ex: Batista, Assembleia)"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(false)} className="flex-1 glass-card py-2.5 rounded-xl text-sm font-semibold text-muted-foreground">
                      Cancelar
                    </button>
                    <button onClick={handleCreate} disabled={!churchName.trim()} className="flex-1 bg-gradient-gold text-secondary-foreground py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                      Criar
                    </button>
                  </div>
                </motion.div>
              )}

              {allChurches.length > 0 && (
                <div>
                  <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2">
                    <Trophy size={18} className="text-secondary" />
                    Top Igrejas
                  </h3>
                  {allChurches.slice(0, 5).map((c, i) => (
                    <div key={c.id} className="glass-card p-3 mb-2 flex items-center gap-3">
                      <span className="w-7 text-center font-bold text-sm text-muted-foreground">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.denomination || 'Sem denominação'} · {c.member_count} membros</p>
                      </div>
                      <span className="text-sm font-bold text-gradient-gold">{c.total_points.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* DASHBOARD */}
          {view === 'dashboard' && myChurch && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="glass-card p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-extrabold font-display text-foreground">{myChurch.name}</h2>
                    <p className="text-xs text-muted-foreground">{myChurch.denomination || 'Sem denominação'}</p>
                  </div>
                  <button onClick={copyCode} className="glass-card px-3 py-1.5 flex items-center gap-1.5">
                    <Copy size={12} className="text-muted-foreground" />
                    <span className="text-xs font-mono font-bold text-secondary">{myChurch.code}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1"><Trophy size={14} className="text-secondary" /></div>
                    <p className="text-lg font-bold text-gradient-gold">{myChurch.total_points.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Pontos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1"><Users size={14} className="text-secondary" /></div>
                    <p className="text-lg font-bold text-foreground">{myChurch.member_count}</p>
                    <p className="text-[10px] text-muted-foreground">Membros</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-1"><Star size={14} className="text-secondary" /></div>
                    <p className="text-lg font-bold text-foreground">
                      {myChurch.member_count > 0 ? Math.round(myChurch.total_points / myChurch.member_count) : 0}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Média</p>
                  </div>
                </div>
              </div>

              {/* Weekly challenges preview */}
              {challenges.length > 0 && (
                <button
                  onClick={() => setView('challenges')}
                  className="w-full glass-card p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center">
                    <Target size={20} className="text-secondary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold font-display text-foreground">Desafios Semanais</p>
                    <p className="text-xs text-muted-foreground">
                      {completedCount}/{challenges.length} completos · {getDaysRemaining()} dias restantes
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gift size={14} className="text-secondary" />
                    <span className="text-xs font-bold text-secondary">{totalReward}</span>
                  </div>
                </button>
              )}

              {/* Members list */}
              <div>
                <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2">
                  <Users size={18} className="text-secondary" />
                  Membros
                </h3>
                {members.map((m, i) => (
                  <motion.div
                    key={m.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card p-3 mb-2 flex items-center gap-3 ${m.user_id === user?.id ? 'ring-1 ring-secondary/30' : ''}`}
                  >
                    <span className="w-7 text-center">
                      {i === 0 ? <Crown size={16} className="text-secondary mx-auto" /> :
                       i === 1 ? <Medal size={16} className="text-muted-foreground mx-auto" /> :
                       <span className="text-xs font-bold text-muted-foreground">{i + 1}º</span>}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                      {(m.profiles?.display_name || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {m.profiles?.display_name || 'Jogador'}
                        {m.user_id === user?.id && <span className="text-[10px] text-secondary ml-1">(você)</span>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-gradient-gold">
                      {(m.profiles?.total_points || 0).toLocaleString()} pts
                    </span>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={handleLeave}
                className="w-full glass-card p-3 flex items-center justify-center gap-2 text-destructive text-sm font-semibold"
              >
                <LogOut size={16} />
                Sair da Igreja
              </button>
            </motion.div>
          )}

          {/* CHALLENGES */}
          {view === 'challenges' && myChurch && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Header card */}
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
                    <span className="text-sm font-bold text-secondary">{totalReward} moedas ganhas</span>
                  </div>
                </div>
              </div>

              {/* Challenge cards */}
              {challengesLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Carregando desafios...</div>
              ) : challenges.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={40} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">Nenhum desafio ativo esta semana</p>
                  <p className="text-muted-foreground text-xs mt-1">Novos desafios são gerados toda segunda-feira</p>
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
                      className={`glass-card p-4 relative overflow-hidden ${isCompleted ? 'ring-1 ring-success/30' : ''}`}
                    >
                      {isCompleted && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 size={18} className="text-success" />
                        </div>
                      )}

                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{challenge.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold font-display text-foreground text-sm">{challenge.title}</p>
                          <p className="text-xs text-muted-foreground">{challenge.description}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Progress 
                          value={percentage} 
                          className={`h-2.5 ${isCompleted ? '[&>div]:bg-gradient-success' : '[&>div]:bg-gradient-gold'}`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {currentValue.toLocaleString()} / {challenge.target_value.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <Gift size={12} className="text-secondary" />
                            <span className={`text-xs font-bold ${isCompleted ? 'text-success' : 'text-secondary'}`}>
                              {isCompleted ? '✓ ' : ''}{challenge.reward_coins} moedas
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              <p className="text-center text-[10px] text-muted-foreground pb-4">
                Jogue quiz para contribuir automaticamente com os desafios da sua igreja!
              </p>
            </motion.div>
          )}

          {/* RANKING */}
          {view === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <h3 className="font-bold font-display text-foreground flex items-center gap-2">
                <Trophy size={18} className="text-secondary" />
                Ranking das Igrejas
              </h3>

              {allChurches.length >= 3 && (
                <div className="flex items-end justify-center gap-2 py-4">
                  {[allChurches[1], allChurches[0], allChurches[2]].map((c, i) => {
                    const heights = ['h-20', 'h-28', 'h-16'];
                    const medals = ['🥈', '🥇', '🥉'];
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="flex flex-col items-center"
                      >
                        <span className="text-2xl mb-1">{medals[i]}</span>
                        <p className="text-[10px] font-bold text-foreground text-center w-20 truncate">{c.name}</p>
                        <p className="text-[9px] text-muted-foreground mb-1">{c.total_points.toLocaleString()} pts</p>
                        <div className={`w-20 ${heights[i]} rounded-t-xl ${i === 1 ? 'bg-gradient-gold' : 'glass-card'}`} />
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {allChurches.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass-card p-3 flex items-center gap-3 ${c.id === myChurch?.id ? 'ring-1 ring-secondary/30' : ''}`}
                >
                  <span className="w-7 text-center font-bold text-sm text-muted-foreground">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">
                      {c.name}
                      {c.id === myChurch?.id && <span className="text-[10px] text-secondary ml-1">⛪</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{c.denomination || 'Sem denominação'} · {c.member_count} membros</p>
                  </div>
                  <span className="text-sm font-bold text-gradient-gold">{c.total_points.toLocaleString()} pts</span>
                </motion.div>
              ))}

              {allChurches.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma igreja cadastrada ainda
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
