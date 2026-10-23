import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getStats } from '@/lib/gameStore';
import { usePlayerLevel, fmtXp } from '@/hooks/usePlayerLevel';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { Award, Target, Zap, Clock, TrendingUp, Star, LogOut, Crown, ShieldCheck, ShoppingBag, Backpack, Trophy, Flame, Users, History, ChartNoAxesColumn, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlayerAvatar from '@/components/PlayerAvatar';
import { useShop } from '@/hooks/useShop';

type ProfileTab = 'overview' | 'stats' | 'achievements' | 'trophies' | 'inventory' | 'history';
type CoinTransaction = { id: string; amount: number; reason: string; created_at: string; balance_after: number };
type ClanSummary = { id: string; name: string; tag: string; emblem: string; league: string; level: number; member_count: number; max_members: number; role: string };

const tabs: { id: ProfileTab; label: string; icon: typeof Star }[] = [
  { id: 'overview', label: 'Visão geral', icon: Star },
  { id: 'stats', label: 'Estatísticas', icon: ChartNoAxesColumn },
  { id: 'achievements', label: 'Conquistas', icon: Award },
  { id: 'trophies', label: 'Troféus', icon: Trophy },
  { id: 'inventory', label: 'Inventário', icon: Backpack },
  { id: 'history', label: 'Histórico', icon: History },
];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { profile, fetchProfile } = useProfile();
  const { info } = usePlayerLevel();
  const shop = useShop();
  const { wallet, itemById } = shop;
  const [savingTitle, setSavingTitle] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [clan, setClan] = useState<ClanSummary | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const localStats = getStats();
  const level = { level: info?.level ?? 1, name: info?.name ?? 'Iniciante', progress: info?.progress ?? 0 };
  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Jogador';
  const stats = {
    totalAnswered: profile?.total_answered ?? localStats.totalAnswered,
    totalCorrect: profile?.total_correct ?? localStats.totalCorrect,
    totalPoints: profile?.total_points ?? localStats.totalPoints,
    bestStreak: profile?.best_streak ?? localStats.bestStreak,
    currentStreak: profile?.current_streak ?? localStats.currentStreak,
    streakDays: profile?.streak_days ?? localStats.streakDays,
    totalTimeMs: profile?.total_time_ms ?? localStats.totalTimeMs,
    easyAnswered: profile?.easy_answered ?? localStats.easyAnswered,
    easyCorrect: profile?.easy_correct ?? localStats.easyCorrect,
    mediumAnswered: profile?.medium_answered ?? localStats.mediumAnswered,
    mediumCorrect: profile?.medium_correct ?? localStats.mediumCorrect,
    hardAnswered: profile?.hard_answered ?? localStats.hardAnswered,
    hardCorrect: profile?.hard_correct ?? localStats.hardCorrect,
    achievements: profile?.achievements ?? localStats.achievements,
  };
  const accuracy = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;
  const avgTime = stats.totalAnswered > 0 ? (stats.totalTimeMs / stats.totalAnswered / 1000).toFixed(1) : '0';

  const loadTabDetails = useCallback(async (tab: ProfileTab) => {
    if (!user || (tab !== 'history' && tab !== 'overview')) return;
    setDetailsLoading(true);
    try {
      if (tab === 'history') {
        const { data, error } = await (supabase.from as any)('coin_transactions')
          .select('id, amount, reason, created_at, balance_after')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        setTransactions((data ?? []) as CoinTransaction[]);
      }
      if (tab === 'overview') {
        const { data, error } = await (supabase.from as any)('clan_members')
          .select('role, clans:clans(id, name, tag, emblem, league, level, member_count, max_members)')
          .eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        const row = data as any;
        setClan(row?.clans ? { ...row.clans, role: row.role } : null);
      }
    } catch {
      if (tab === 'history') toast.error('Não foi possível carregar o histórico de moedas.');
      if (tab === 'overview') setClan(null);
    } finally {
      setDetailsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadTabDetails(activeTab); }, [activeTab, loadTabDetails]);

  const chooseTitle = async (t: string) => {
    setSavingTitle(true);
    const { error } = await (supabase.rpc as any)('set_active_title', { p_title: t });
    setSavingTitle(false);
    if (error) return toast.error('Não foi possível trocar o título');
    await fetchProfile();
    await shop.refresh();
    toast.success(t ? 'Título equipado!' : 'Título removido.');
  };

  const statCards = [
    { icon: Target, label: 'Perguntas respondidas', value: stats.totalAnswered },
    { icon: TrendingUp, label: 'Precisão', value: `${accuracy}%` },
    { icon: Star, label: 'Pontuação', value: stats.totalPoints },
    { icon: Zap, label: 'Melhor sequência', value: stats.bestStreak },
    { icon: Clock, label: 'Tempo médio', value: `${avgTime}s` },
    { icon: Award, label: 'Conquistas', value: stats.achievements.length },
  ];
  const difficulty = [
    { label: 'Fácil', answered: stats.easyAnswered, correct: stats.easyCorrect, color: 'bg-emerald-500' },
    { label: 'Médio', answered: stats.mediumAnswered, correct: stats.mediumCorrect, color: 'bg-amber-500' },
    { label: 'Difícil', answered: stats.hardAnswered, correct: stats.hardCorrect, color: 'bg-rose-500' },
  ];
  const itemCounts = shop.items.filter((it) => shop.isOwned(it)).reduce<Record<string, number>>((acc, it) => {
    acc[it.category] = (acc[it.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-4 sm:px-5 pt-8 sm:pt-12 safe-area-top max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl font-extrabold font-display text-foreground">Meu Perfil</h1>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground shrink-0">
            <LogOut size={16} /><span className="ml-1 text-xs">Sair</span>
          </Button>
        </div>

        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 sm:p-6 mb-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <PlayerAvatar size={92} icon={itemById(wallet?.equipped_avatar)?.icon}
              frameStyle={itemById(wallet?.equipped_frame)?.style}
              effectStyle={itemById(wallet?.equipped_effect)?.style} fallback={level.level} />
            <div className="flex-1 min-w-0 text-center sm:text-left w-full">
              <h2 className="text-xl sm:text-2xl font-bold font-display text-gradient-gold break-words">
                {itemById(wallet?.equipped_badge)?.icon} {displayName}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Perfil do jogador</p>
              {(wallet?.active_title || profile?.active_title) && (
                <p className="text-sm text-secondary font-bold flex items-center gap-1 justify-center sm:justify-start mt-2">
                  <Crown size={14} /> {wallet?.active_title || profile?.active_title}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-foreground">⭐ Nível {level.level}</span>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">🪙 {fmtXp(wallet?.coins ?? profile?.coins ?? 0)}</span>
                {clan && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-foreground">🛡️ [{clan.tag}] {clan.name}</span>}
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3" aria-label="Badges em destaque">
                {(wallet?.featured_badges ?? []).slice(0, 3).map((id) => {
                  const item = itemById(id);
                  return item ? <span key={id} title={item.name} className="glass-card px-2 py-1 text-sm">{item.icon} <span className="text-xs">{item.name}</span></span> : null;
                })}
              </div>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                <Button size="sm" onClick={() => navigate('/inventory')}><Star size={14} className="mr-1" /> Personalizar perfil</Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/shop')}><ShoppingBag size={14} className="mr-1" /> Loja</Button>
              </div>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-border/60">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-bold text-foreground">⭐ Progressão · {level.name}</p>
              <span className="text-xs text-muted-foreground">{Math.round(level.progress)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label="Progresso de XP para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress)}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${level.progress}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full bg-gradient-gold motion-reduce:transition-none" />
            </div>
            <div className="flex flex-wrap justify-between gap-2 mt-2 text-xs text-muted-foreground">
              <span>{fmtXp(info?.level_xp ?? 0)} / {fmtXp(info?.next_level_xp ?? 100)} XP</span>
              <span>{fmtXp(info?.remaining_xp ?? 0)} XP para o próximo nível</span>
            </div>
          </div>
        </motion.section>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="glass-card p-3"><Flame size={17} className="text-orange-500 mb-1" /><p className="text-lg font-extrabold text-foreground">{stats.currentStreak}</p><p className="text-[11px] text-muted-foreground">Sequência atual</p><p className="text-[10px] text-muted-foreground">Recorde: {stats.bestStreak} dias</p></div>
          <div className="glass-card p-3"><Trophy size={17} className="text-secondary mb-1" /><p className="text-lg font-extrabold text-foreground">{stats.achievements.length}</p><p className="text-[11px] text-muted-foreground">Conquistas</p></div>
          <div className="glass-card p-3"><BookOpen size={17} className="text-primary mb-1" /><p className="text-lg font-extrabold text-foreground">{stats.totalAnswered}</p><p className="text-[11px] text-muted-foreground">Perguntas</p></div>
          <div className="glass-card p-3"><Target size={17} className="text-emerald-500 mb-1" /><p className="text-lg font-extrabold text-foreground">{accuracy}%</p><p className="text-[11px] text-muted-foreground">Precisão</p></div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <Button variant="outline" onClick={() => navigate('/shop')} className="justify-between">🪙 Carteira e Loja <ChevronRight size={15} /></Button>
          <Button variant="outline" onClick={() => navigate('/inventory')} className="justify-between">🎒 Inventário <ChevronRight size={15} /></Button>
        </div>

        <div className="mb-5 -mx-1 overflow-x-auto">
          <div role="tablist" aria-label="Seções do perfil" className="flex min-w-max gap-1 px-1 pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'glass-card text-muted-foreground'}`}>
                <Icon size={14} /> {tab.label}
              </button>;
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <section className="glass-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-bold text-foreground">🛡️ Meu Clã</h2><Button size="sm" variant="ghost" onClick={() => navigate('/clans')}>Explorar <ChevronRight size={14} /></Button></div>
              {detailsLoading ? <p className="text-sm text-muted-foreground">Carregando clã…</p> : clan ? (
                <button type="button" onClick={() => navigate('/clans')} className="w-full flex items-center gap-3 text-left rounded-xl p-3 bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="text-3xl">{clan.emblem || '🛡️'}</span><span className="flex-1 min-w-0"><span className="block font-bold text-foreground truncate">{clan.name} [{clan.tag}]</span><span className="block text-xs text-muted-foreground">{clan.league} · Nível {clan.level} · {clan.member_count}/{clan.max_members} membros</span></span><span className="text-xs text-secondary font-semibold">{clan.role === 'leader' ? '👑 Líder' : clan.role === 'vice' ? '🛡️ Vice-líder' : '⚔️ Membro'}</span>
                </button>
              ) : <div className="rounded-xl bg-muted/30 p-4"><p className="font-semibold text-foreground">Você ainda não faz parte de um clã</p><p className="text-xs text-muted-foreground mt-1">Junte-se a outros jogadores e evoluam juntos.</p><Button size="sm" className="mt-3" onClick={() => navigate('/clans')}>Explorar clãs</Button></div>}
            </section>
            <section className="glass-card p-4">
              <h2 className="font-bold text-foreground mb-3">🏅 Resumo das conquistas</h2>
              <p className="text-sm text-muted-foreground mb-3">{stats.achievements.length} conquistas desbloqueadas</p>
              <Button variant="outline" className="w-full justify-between" onClick={() => setActiveTab('achievements')}>Ver conquistas <ChevronRight size={15} /></Button>
            </section>
            <section className="glass-card p-4">
              <h2 className="font-bold text-foreground mb-3">📚 Itens no inventário</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  ['Avatares', itemCounts.avatar ?? 0], ['Molduras', itemCounts.frame ?? 0], ['Títulos', itemCounts.title ?? 0],
                  ['Badges', itemCounts.badge ?? 0], ['Efeitos', itemCounts.effect ?? 0], ['Clã', itemCounts.clan ?? 0],
                ].map(([label, count]) => <div key={String(label)} className="rounded-lg bg-muted/40 p-3"><p className="text-lg font-bold text-foreground">{count}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
              </div>
              <Button variant="outline" className="w-full mt-3 justify-between" onClick={() => navigate('/inventory')}>Abrir inventário <ChevronRight size={15} /></Button>
            </section>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">📊 Estatísticas gerais</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {statCards.map((s, i) => <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card p-3 flex items-center gap-3"><s.icon size={18} className="text-secondary shrink-0" /><div className="min-w-0"><p className="text-lg font-bold text-foreground">{s.value}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div></motion.div>)}
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mb-3">Desempenho por dificuldade</h2>
            <div className="space-y-2 mb-6">
              {difficulty.map((d) => { const pct = d.answered > 0 ? Math.round((d.correct / d.answered) * 100) : 0; return <div key={d.label} className="glass-card p-3"><div className="flex justify-between gap-2 text-sm mb-2"><span className="font-semibold text-foreground">{d.label}</span><span className="text-muted-foreground">{d.correct}/{d.answered} · {pct}%</span></div><div className="h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-label={`Precisão ${d.label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><div className={`h-full rounded-full ${d.color}`} style={{ width: `${pct}%` }} /></div></div>; })}
            </div>
            <p className="text-xs text-muted-foreground">As estatísticas são exibidas a partir dos dados disponíveis no perfil e no progresso local sincronizado.</p>
          </div>
        )}

        {activeTab === 'achievements' && (
          <section className="glass-card p-5 text-center">
            <Award size={32} className="mx-auto text-secondary mb-3" /><h2 className="text-lg font-bold text-foreground">Conquistas</h2>
            <p className="text-sm text-muted-foreground mt-1">{stats.achievements.length} conquistas desbloqueadas</p>
            <Button className="mt-4" onClick={() => navigate('/achievements')}>Ver todas as conquistas</Button>
          </section>
        )}
        {activeTab === 'trophies' && (
          <section className="glass-card p-5 text-center">
            <Trophy size={32} className="mx-auto text-secondary mb-3" /><h2 className="text-lg font-bold text-foreground">Sala de troféus</h2>
            <p className="text-sm text-muted-foreground mt-1">Veja suas conquistas e continue participando de desafios e eventos para ampliar sua coleção.</p>
            <Button className="mt-4" onClick={() => navigate('/achievements')}>Ver conquistas disponíveis</Button>
          </section>
        )}
        {activeTab === 'inventory' && (
          <section className="glass-card p-5 text-center">
            <Backpack size={32} className="mx-auto text-secondary mb-3" /><h2 className="text-lg font-bold text-foreground">Personalize sua identidade</h2>
            <p className="text-sm text-muted-foreground mt-1">Equipe apenas itens que você já adquiriu. Avatares, molduras, efeitos, títulos e badges são gerenciados pelo inventário.</p>
            <Button className="mt-4" onClick={() => navigate('/inventory')}>Abrir inventário</Button>
          </section>
        )}
        {activeTab === 'history' && (
          <section className="glass-card p-4">
            <h2 className="text-lg font-bold text-foreground mb-1">🕒 Histórico de moedas</h2>
            <p className="text-xs text-muted-foreground mb-4">Últimas transações registradas no sistema.</p>
            {detailsLoading ? <p className="text-sm text-muted-foreground py-5 text-center">Carregando histórico…</p> : transactions.length === 0 ? <p className="text-sm text-muted-foreground py-5 text-center">Nenhuma transação encontrada.</p> : <div className="space-y-2">{transactions.map((tx) => <div key={tx.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3"><span className={`text-lg font-bold ${tx.amount >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground truncate">{tx.reason}</p><p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString('pt-BR')}</p></div><span className="text-[10px] text-muted-foreground">Saldo: {tx.balance_after}</span></div>)}</div>}
          </section>
        )}

        {!!profile?.titles?.length && (
          <section className="mt-5">
            <h2 className="text-lg font-bold font-display text-foreground mb-3">🏷️ Títulos desbloqueados</h2>
            <div className="flex flex-wrap gap-2">
              {profile.titles.map((t) => <Button key={t} size="sm" disabled={savingTitle} variant={(wallet?.active_title || profile.active_title) === t ? 'default' : 'outline'} onClick={() => chooseTitle((wallet?.active_title || profile.active_title) === t ? '' : t)}>{t}</Button>)}
            </div>
          </section>
        )}

        {isAdmin && <Button onClick={() => navigate('/admin')} className="w-full mt-6"><ShieldCheck size={16} className="mr-2" /> Painel Admin</Button>}
      </div>
    </div>
  );
}
