import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Church, Users, Trophy, Copy, LogOut, Plus, Search, Crown, Medal, Star,
  Target, Gift, CheckCircle2, Clock, Shield, Flame, TrendingUp, Share2,
  ChevronRight, Sparkles, Zap, Award, UserPlus
} from 'lucide-react';
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

const TIER_CONFIG = [
  { name: 'Bronze', min: 0, color: 'from-amber-700 to-amber-900', icon: '🥉', textColor: 'text-amber-600' },
  { name: 'Prata', min: 5000, color: 'from-slate-300 to-slate-500', icon: '🥈', textColor: 'text-slate-400' },
  { name: 'Ouro', min: 15000, color: 'from-yellow-400 to-amber-500', icon: '🥇', textColor: 'text-yellow-500' },
  { name: 'Diamante', min: 50000, color: 'from-cyan-300 to-blue-500', icon: '💎', textColor: 'text-cyan-400' },
  { name: 'Lendário', min: 150000, color: 'from-purple-400 to-pink-500', icon: '👑', textColor: 'text-purple-400' },
];

function getTier(points: number) {
  let tier = TIER_CONFIG[0];
  for (const t of TIER_CONFIG) {
    if (points >= t.min) tier = t;
  }
  return tier;
}

function getNextTier(points: number) {
  for (const t of TIER_CONFIG) {
    if (points < t.min) return t;
  }
  return null;
}

export default function LeaguePage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [view, setView] = useState<View>('lobby');
  const [myChurch, setMyChurch] = useState<ChurchData | null>(null);
  const [members, setMembers] = useState<MemberData[]>([]);
  const [allChurches, setAllChurches] = useState<ChurchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [churchName, setChurchName] = useState('');
  const [denomination, setDenomination] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const { challenges, loading: challengesLoading, fetchChallenges } = useWeeklyChallenges(myChurch?.id || null);

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

    toast.success('Igreja criada com sucesso! 🎉');
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

    toast.success(`Bem-vindo à ${church.name}! ⛪`);
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

  const shareInvite = () => {
    if (!myChurch) return;
    const text = `🏛️ Entre na minha igreja "${myChurch.name}" no Scripture Masters!\n\nCódigo: ${myChurch.code}`;
    if (navigator.share) {
      navigator.share({ title: 'Convite da Igreja', text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Convite copiado!');
    }
  };

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

  const myRank = useMemo(() => {
    if (!myChurch) return null;
    const idx = allChurches.findIndex(c => c.id === myChurch.id);
    return idx >= 0 ? idx + 1 : null;
  }, [allChurches, myChurch]);

  const tier = myChurch ? getTier(myChurch.total_points) : TIER_CONFIG[0];
  const nextTier = myChurch ? getNextTier(myChurch.total_points) : TIER_CONFIG[1];
  const tierProgress = nextTier && myChurch
    ? Math.min(100, ((myChurch.total_points - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow-gold"
        >
          <Church size={22} className="text-secondary-foreground" />
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { key: 'dashboard' as const, label: 'Igreja', icon: Church },
    { key: 'challenges' as const, label: 'Desafios', icon: Target },
    { key: 'ranking' as const, label: 'Ranking', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/8 to-transparent pointer-events-none" />
        <div className="absolute top-4 right-4 w-40 h-40 bg-secondary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />

        <div className="relative px-5 pt-14 pb-5 safe-area-top">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow-gold">
              <Shield size={20} className="text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold font-display text-foreground tracking-tight">
                Liga das <span className="text-gradient-gold">Igrejas</span>
              </h1>
              <p className="text-xs text-muted-foreground">
                {myChurch ? `${tier.icon} ${tier.name} · Posição #${myRank || '—'}` : 'Junte-se a uma comunidade'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      {myChurch && (
        <div className="px-5 mb-5">
          <div className="flex bg-muted/50 rounded-2xl p-1 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = view === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setView(tab.key);
                    if (tab.key === 'ranking') fetchAllChurches();
                    if (tab.key === 'challenges') fetchChallenges();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-card shadow-card text-secondary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.key === 'challenges' && completedCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-secondary text-secondary-foreground text-[9px] font-black flex items-center justify-center">
                      {completedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 space-y-4">
        <AnimatePresence mode="wait">
          {/* =================== LOBBY =================== */}
          {view === 'lobby' && !myChurch && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-5"
            >
              {/* Welcome banner */}
              <div className="relative glass-card p-6 overflow-hidden">
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-gradient-gold rounded-full opacity-10 blur-xl" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-secondary" />
                    <span className="text-xs font-bold text-secondary uppercase tracking-wider">Nova Temporada</span>
                  </div>
                  <h2 className="text-lg font-extrabold font-display text-foreground mb-1">
                    Competição entre Igrejas
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Crie ou entre em uma igreja, complete desafios semanais e suba no ranking!
                  </p>
                </div>
              </div>

              {/* Join */}
              <div className="glass-card p-5">
                <h3 className="font-bold font-display text-foreground mb-3 flex items-center gap-2 text-sm">
                  <UserPlus size={16} className="text-secondary" />
                  Entrar em uma Igreja
                </h3>
                <div className="flex gap-2">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO"
                    maxLength={6}
                    className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50 uppercase tracking-[0.3em] text-center font-mono font-bold"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={joinCode.length < 4}
                    className="bg-gradient-gold text-secondary-foreground px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-40 shadow-glow-gold/50 transition-all active:scale-95"
                  >
                    Entrar
                  </button>
                </div>
              </div>

              {/* Create */}
              {!showCreate ? (
                <motion.button
                  onClick={() => setShowCreate(true)}
                  className="w-full glass-card p-5 flex items-center gap-4 text-left group"
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-blue/30">
                    <Plus size={22} className="text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold font-display text-foreground">Criar Nova Igreja</p>
                    <p className="text-xs text-muted-foreground">Monte sua equipe e domine o ranking</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-5 space-y-4"
                >
                  <h3 className="font-bold font-display text-foreground flex items-center gap-2">
                    <Church size={18} className="text-secondary" />
                    Nova Igreja
                  </h3>
                  <div className="space-y-3">
                    <input
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      placeholder="Nome da igreja"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    />
                    <input
                      value={denomination}
                      onChange={(e) => setDenomination(e.target.value)}
                      placeholder="Denominação (opcional)"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(false)} className="flex-1 glass-card py-3 rounded-xl text-sm font-semibold text-muted-foreground">
                      Cancelar
                    </button>
                    <button onClick={handleCreate} disabled={!churchName.trim()} className="flex-1 bg-gradient-gold text-secondary-foreground py-3 rounded-xl text-sm font-bold disabled:opacity-40 shadow-glow-gold/50 active:scale-95 transition-all">
                      Criar Igreja
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Top Churches Preview */}
              {allChurches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold font-display text-foreground flex items-center gap-2 text-sm">
                      <Flame size={16} className="text-secondary" />
                      Top Igrejas
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{allChurches.length} igrejas</span>
                  </div>
                  {allChurches.slice(0, 5).map((c, i) => {
                    const churchTier = getTier(c.total_points);
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="glass-card p-3.5 flex items-center gap-3"
                      >
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${churchTier.color} flex items-center justify-center text-sm`}>
                          {i < 3 ? ['🥇', '🥈', '🥉'][i] : <span className="text-xs font-black text-foreground">{i + 1}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.denomination || 'Comunidade'} · {c.member_count} membros</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-extrabold text-gradient-gold">{c.total_points.toLocaleString()}</span>
                          <p className="text-[9px] text-muted-foreground">pontos</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* =================== DASHBOARD =================== */}
          {view === 'dashboard' && myChurch && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Church Card */}
              <div className="relative glass-card overflow-hidden">
                {/* Background decoration */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-[0.06]`} />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-secondary/5 rounded-full blur-2xl" />

                <div className="relative p-5">
                  {/* Church name + tier */}
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{tier.icon}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${tier.textColor}`}>
                          {tier.name}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold font-display text-foreground leading-tight">{myChurch.name}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{myChurch.denomination || 'Comunidade de fé'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={copyCode} className="glass-card p-2 hover:bg-muted/80 transition-colors" title="Copiar código">
                        <Copy size={14} className="text-muted-foreground" />
                      </button>
                      <button onClick={shareInvite} className="glass-card p-2 hover:bg-muted/80 transition-colors" title="Compartilhar convite">
                        <Share2 size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  {/* Invite code banner */}
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl px-4 py-2.5 mb-5">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Código</span>
                    <span className="font-mono font-black text-lg tracking-[0.25em] text-secondary flex-1">{myChurch.code}</span>
                    <button onClick={copyCode} className="text-xs text-secondary font-bold hover:underline">Copiar</button>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-gold flex items-center justify-center mb-2">
                        <Trophy size={14} className="text-secondary-foreground" />
                      </div>
                      <p className="text-lg font-extrabold text-gradient-gold">{myChurch.total_points.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Pontos</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-primary flex items-center justify-center mb-2">
                        <Users size={14} className="text-primary-foreground" />
                      </div>
                      <p className="text-lg font-extrabold text-foreground">{myChurch.member_count}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">Membros</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-success flex items-center justify-center mb-2">
                        <TrendingUp size={14} className="text-foreground" />
                      </div>
                      <p className="text-lg font-extrabold text-foreground">
                        #{myRank || '—'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">Ranking</p>
                    </div>
                  </div>

                  {/* Tier progress */}
                  {nextTier && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Próximo: {nextTier.icon} {nextTier.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {myChurch.total_points.toLocaleString()} / {nextTier.min.toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={tierProgress}
                        className="h-2 [&>div]:bg-gradient-gold"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                {/* Challenges card */}
                <button
                  onClick={() => { setView('challenges'); fetchChallenges(); }}
                  className="glass-card p-4 text-left group active:scale-[0.98] transition-transform"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-gold flex items-center justify-center mb-3">
                    <Target size={16} className="text-secondary-foreground" />
                  </div>
                  <p className="text-xs font-bold font-display text-foreground mb-0.5">Desafios</p>
                  <p className="text-[10px] text-muted-foreground">
                    {completedCount}/{challenges.length} completos
                  </p>
                  {challenges.length > 0 && (
                    <Progress
                      value={(completedCount / challenges.length) * 100}
                      className="h-1 mt-2 [&>div]:bg-gradient-gold"
                    />
                  )}
                </button>

                {/* Ranking card */}
                <button
                  onClick={() => { setView('ranking'); fetchAllChurches(); }}
                  className="glass-card p-4 text-left group active:scale-[0.98] transition-transform"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center mb-3">
                    <Trophy size={16} className="text-primary-foreground" />
                  </div>
                  <p className="text-xs font-bold font-display text-foreground mb-0.5">Ranking</p>
                  <p className="text-[10px] text-muted-foreground">
                    Posição #{myRank || '—'}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp size={10} className="text-secondary" />
                    <span className="text-[9px] font-bold text-secondary">Ver ranking</span>
                  </div>
                </button>
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold font-display text-foreground flex items-center gap-2 text-sm">
                    <Users size={16} className="text-secondary" />
                    Membros
                    <span className="text-[10px] text-muted-foreground font-normal">({members.length})</span>
                  </h3>
                  <button onClick={shareInvite} className="flex items-center gap-1 text-xs text-secondary font-bold">
                    <UserPlus size={12} />
                    Convidar
                  </button>
                </div>
                {members.map((m, i) => {
                  const isOwner = m.user_id === myChurch.owner_id;
                  const isMe = m.user_id === user?.id;
                  return (
                    <motion.div
                      key={m.user_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`glass-card p-3 mb-2 flex items-center gap-3 ${isMe ? 'ring-1 ring-secondary/30' : ''}`}
                    >
                      <span className="w-6 text-center">
                        {i === 0 ? <Crown size={14} className="text-secondary mx-auto" /> :
                         i === 1 ? <Medal size={14} className="text-muted-foreground mx-auto" /> :
                         i === 2 ? <Award size={14} className="text-muted-foreground mx-auto" /> :
                         <span className="text-[10px] font-bold text-muted-foreground">{i + 1}</span>}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground ring-2 ring-border">
                        {(m.profiles?.display_name || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {m.profiles?.display_name || 'Jogador'}
                          </p>
                          {isOwner && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary font-bold uppercase tracking-wider">
                              Líder
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {(m.profiles?.total_points || 0).toLocaleString()} pontos contribuídos
                        </p>
                      </div>
                      <span className="text-sm font-extrabold text-gradient-gold">
                        {(m.profiles?.total_points || 0).toLocaleString()}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Leave button */}
              <button
                onClick={handleLeave}
                className="w-full glass-card p-3 flex items-center justify-center gap-2 text-destructive/70 text-xs font-semibold hover:text-destructive transition-colors"
              >
                <LogOut size={14} />
                Sair da Igreja
              </button>
            </motion.div>
          )}

          {/* =================== CHALLENGES =================== */}
          {view === 'challenges' && myChurch && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Summary header */}
              <div className="glass-card p-5 relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-secondary/8 rounded-full blur-2xl" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-glow-gold/30">
                      <Target size={20} className="text-secondary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-extrabold font-display text-foreground">Desafios Semanais</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={11} />
                        <span>{getDaysRemaining()} dias restantes</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-extrabold text-gradient-gold">{completedCount}</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Completos</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <p className="text-lg font-extrabold text-foreground">{challenges.length}</p>
                      <p className="text-[9px] text-muted-foreground font-medium">Total</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Gift size={12} className="text-secondary" />
                        <p className="text-lg font-extrabold text-secondary">{totalReward}</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground font-medium">Moedas</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Challenge cards */}
              {challengesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-card p-4 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-muted rounded w-2/3" />
                          <div className="h-2 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full" />
                    </div>
                  ))}
                </div>
              ) : challenges.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Target size={28} className="text-muted-foreground opacity-40" />
                  </div>
                  <p className="text-foreground font-bold font-display mb-1">Sem desafios ativos</p>
                  <p className="text-muted-foreground text-xs">Novos desafios são gerados toda segunda-feira</p>
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
                      className={`glass-card p-4 relative overflow-hidden ${isCompleted ? 'ring-1 ring-success/40' : ''}`}
                    >
                      {isCompleted && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-success" />
                      )}

                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isCompleted ? 'bg-success/15' : 'bg-muted/60'}`}>
                          {challenge.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold font-display text-foreground text-sm truncate">{challenge.title}</p>
                            {isCompleted && <CheckCircle2 size={14} className="text-success shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Progress
                          value={percentage}
                          className={`h-2 ${isCompleted ? '[&>div]:bg-gradient-success' : '[&>div]:bg-gradient-gold'}`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {currentValue.toLocaleString()} / {challenge.target_value.toLocaleString()}
                            <span className="ml-1 text-foreground/60">({Math.round(percentage)}%)</span>
                          </span>
                          <div className="flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-full">
                            <Gift size={10} className="text-secondary" />
                            <span className={`text-[10px] font-bold ${isCompleted ? 'text-success' : 'text-secondary'}`}>
                              {challenge.reward_coins}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              <div className="glass-card p-3 flex items-center gap-2">
                <Zap size={14} className="text-secondary shrink-0" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Jogue quiz para contribuir automaticamente com os desafios da sua igreja!
                </p>
              </div>
            </motion.div>
          )}

          {/* =================== RANKING =================== */}
          {view === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="font-extrabold font-display text-foreground flex items-center gap-2">
                <Trophy size={18} className="text-secondary" />
                Ranking Global
              </h3>

              {/* Podium */}
              {allChurches.length >= 3 && (
                <div className="glass-card p-5 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 to-transparent pointer-events-none" />
                  <div className="relative flex items-end justify-center gap-3 pt-2 pb-1">
                    {[
                      { church: allChurches[1], medal: '🥈', height: 'h-20', rank: 2 },
                      { church: allChurches[0], medal: '🥇', height: 'h-28', rank: 1 },
                      { church: allChurches[2], medal: '🥉', height: 'h-16', rank: 3 },
                    ].map(({ church, medal, height, rank }) => (
                      <motion.div
                        key={church.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (rank === 1 ? 0 : rank === 2 ? 0.15 : 0.3) }}
                        className="flex flex-col items-center w-24"
                      >
                        <span className={`text-2xl mb-1 ${rank === 1 ? 'animate-bounce' : ''}`}>{medal}</span>
                        <p className="text-[10px] font-extrabold text-foreground text-center truncate w-full">{church.name}</p>
                        <p className="text-[9px] text-muted-foreground mb-2">
                          {church.total_points.toLocaleString()} pts
                        </p>
                        <div className={`w-full ${height} rounded-t-xl ${rank === 1 ? 'bg-gradient-gold shadow-glow-gold/20' : 'bg-muted/60'} flex items-center justify-center`}>
                          <span className={`text-xs font-black ${rank === 1 ? 'text-secondary-foreground' : 'text-muted-foreground'}`}>
                            {church.member_count} 👥
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full list */}
              <div className="space-y-2">
                {allChurches.map((c, i) => {
                  const churchTier = getTier(c.total_points);
                  const isMyChurch = c.id === myChurch?.id;
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`glass-card p-3.5 flex items-center gap-3 ${isMyChurch ? 'ring-1 ring-secondary/40 bg-secondary/5' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${churchTier.color} flex items-center justify-center shrink-0`}>
                        {i < 3 ? (
                          <span className="text-sm">{['🥇', '🥈', '🥉'][i]}</span>
                        ) : (
                          <span className="text-[10px] font-black text-foreground">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-foreground truncate">{c.name}</p>
                          {isMyChurch && <span className="text-xs text-secondary">⛪</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {c.denomination || 'Comunidade'} · {c.member_count} membros · {churchTier.icon} {churchTier.name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-gradient-gold">{c.total_points.toLocaleString()}</span>
                        <p className="text-[9px] text-muted-foreground">pontos</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {allChurches.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Trophy size={28} className="text-muted-foreground opacity-40" />
                  </div>
                  <p className="text-foreground font-bold font-display mb-1">Nenhuma igreja ainda</p>
                  <p className="text-muted-foreground text-xs">Seja o primeiro a criar uma!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
