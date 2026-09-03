import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Shield, Users, Plus, Crown, LogOut, Settings, Share2, Trash2,
  ChevronUp, ChevronDown, UserMinus, Check, X, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useClan, clanLevelInfo, LEAGUES, ROLE_LABEL, type ClanRole } from '@/hooks/useClan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

const EMBLEMS = ['🛡️', '✝️', '🔥', '👑', '⚔️', '🕊️', '📖', '⭐', '🦁', '🌿'];

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

/* ---------------- Criar clã ---------------- */
function CreateClanDialog({ displayName, onDone }: { displayName: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [emblem, setEmblem] = useState('🛡️');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await (supabase.rpc as any)('create_clan', {
      p_name: name,
      p_tag: tag,
      p_description: description,
      p_emblem: emblem,
      p_visibility: visibility,
      p_display_name: displayName,
    });
    setSaving(false);
    if (error) return toast.error(errMsg(error));
    toast.success('Clã criado! Você é o líder 👑');
    setOpen(false);
    onDone();
  };

  const valid = name.trim().length >= 3 && tag.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-12 font-bold">
          <Plus size={18} className="mr-2" /> Criar meu clã
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar clã</DialogTitle>
          <DialogDescription>Reúna irmãos para estudar e competir juntos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="clan-name">Nome</Label>
            <Input id="clan-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Guerreiros da Fé" />
          </div>
          <div>
            <Label htmlFor="clan-tag">Tag (2–5 letras)</Label>
            <Input id="clan-tag" value={tag} maxLength={5} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="FE" />
          </div>
          <div>
            <Label htmlFor="clan-desc">Descrição</Label>
            <Textarea id="clan-desc" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder="Nosso propósito..." />
          </div>
          <div>
            <Label>Brasão</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EMBLEMS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Brasão ${e}`}
                  aria-pressed={emblem === e}
                  onClick={() => setEmblem(e)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border ${emblem === e ? 'border-secondary bg-secondary/15' : 'border-border bg-muted/40'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Visibilidade</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['public', 'private'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={visibility === v}
                  onClick={() => setVisibility(v)}
                  className={`p-3 rounded-xl text-sm font-semibold border ${visibility === v ? 'border-secondary bg-secondary/15 text-foreground' : 'border-border bg-muted/40 text-muted-foreground'}`}
                >
                  {v === 'public' ? 'Público' : 'Privado'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Privado exige aprovação do líder ou vice para entrar.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!valid || saving} className="w-full">
            {saving && <Loader2 size={16} className="mr-2 animate-spin" />} Criar clã
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Explorar ---------------- */
interface ClanSummary {
  id: string; name: string; tag: string; description: string; emblem: string;
  visibility: string; member_count: number; max_members: number; xp: number; level: number; league: string;
}

function ExploreClans({ displayName, inClan, onJoined }: { displayName: string; inClan: boolean; onJoined: () => void }) {
  const [query, setQuery] = useState('');
  const [clans, setClans] = useState<ClanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data } = await (supabase.rpc as any)('search_clans', { p_query: query, p_limit: 30 });
      if (!cancelled) {
        setClans((data as ClanSummary[]) ?? []);
        setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const join = async (clan: ClanSummary) => {
    setBusy(clan.id);
    const { data, error } = await (supabase.rpc as any)('request_join_clan', {
      p_clan_id: clan.id,
      p_display_name: displayName,
    });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success(data === 'joined' ? `Bem-vindo ao ${clan.name}!` : 'Pedido enviado! Aguarde aprovação.');
    onJoined();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou tag"
          aria-label="Buscar clãs"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : clans.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <Shield size={28} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-semibold text-foreground">Nenhum clã encontrado</p>
          <p className="text-xs text-muted-foreground mt-1">Tente outra busca ou crie o seu.</p>
        </div>
      ) : (
        clans.map((c, i) => {
          const lvl = clanLevelInfo(c.xp);
          const full = c.member_count >= c.max_members;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="glass-card p-4 flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center text-xl shrink-0">
                {c.emblem}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">
                  {c.name} <span className="text-xs text-secondary">[{c.tag}]</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {LEAGUES[c.league]?.icon} {LEAGUES[c.league]?.label ?? c.league} • Nível {lvl.level} • {c.member_count}/{c.max_members} membros
                </p>
                <p className="text-[11px] text-muted-foreground">🔥 {c.xp.toLocaleString('pt-BR')} XP</p>
              </div>
              <Button
                size="sm"
                variant={c.visibility === 'private' ? 'outline' : 'default'}
                disabled={inClan || full || busy === c.id}
                onClick={() => join(c)}
              >
                {busy === c.id ? <Loader2 size={14} className="animate-spin" /> : full ? 'Lotado' : c.visibility === 'private' ? 'Solicitar' : 'Entrar'}
              </Button>
            </motion.div>
          );
        })
      )}
    </div>
  );
}

/* ---------------- Excluir clã (2 etapas) ---------------- */
function DeleteClanDialog({ clanId, clanName, onDone }: { clanId: string; clanName: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [confirmName, setConfirmName] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const { error } = await (supabase.rpc as any)('delete_clan_v2', { p_clan_id: clanId, p_confirm_name: confirmName });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success('Clã encerrado.');
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setStep(1); setConfirmName(''); }}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 size={16} className="mr-2" /> Excluir clã
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir clã</DialogTitle>
          <DialogDescription>
            Esta ação é permanente. O clã será encerrado e deixará de participar das próximas competições.
          </DialogDescription>
        </DialogHeader>
        {step === 1 ? (
          <DialogFooter>
            <Button variant="destructive" className="w-full" onClick={() => setStep(2)}>Entendi, continuar</Button>
          </DialogFooter>
        ) : (
          <>
            <div>
              <Label htmlFor="confirm-name">Digite <strong>{clanName}</strong> para confirmar</Label>
              <Input id="confirm-name" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                className="w-full"
                disabled={confirmName.trim().toLowerCase() !== clanName.toLowerCase() || busy}
                onClick={run}
              >
                {busy && <Loader2 size={16} className="mr-2 animate-spin" />} Excluir definitivamente
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Página ---------------- */
export default function ClansPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { clan, members, applications, myRole, myApplication, loading, refresh, canManage, isLeader } = useClan();
  const { invites, refresh: refreshInvites } = useMyClanInvites();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'explore' ? 'explore' : 'mine');
  const [busy, setBusy] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitesKey, setInvitesKey] = useState(0);
  const [welcome, setWelcome] = useState<string | null>(null);

  const displayName = profile?.display_name || (user?.user_metadata?.display_name as string) || 'Jogador';
  const lvl = useMemo(() => clanLevelInfo(clan?.xp ?? 0), [clan?.xp]);

  useEffect(() => {
    if (!loading && !clan && tab === 'mine' && params.get('tab') !== 'mine' && myApplication === null) {
      // mantém a aba "Meu Clã" mostrando o estado vazio; nada a fazer
    }
  }, [loading, clan, tab, params, myApplication]);

  const changeTab = (v: string) => {
    setTab(v);
    setParams(v === 'explore' ? { tab: 'explore' } : {}, { replace: true });
  };

  const act = async (key: string, fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(key);
    const { error } = await (supabase.rpc as any)(fn, args);
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    toast.success(ok);
    refresh();
  };

  const share = async () => {
    if (!clan) return;
    const url = `${window.location.origin}/clans?tab=explore&clan=${clan.id}`;
    const text = `Venha para o clã ${clan.name} [${clan.tag}] no Bible Quiz Master! ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: clan.name, text, url });
      else {
        await navigator.clipboard.writeText(text);
        toast.success('Convite copiado!');
      }
    } catch {
      /* usuário cancelou */
    }
  };

  const roleOrder: Record<ClanRole, number> = { leader: 0, vice: 1, member: 2 };
  const sortedMembers = [...members].sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role] || b.xp_contributed - a.xp_contributed,
  );

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 pb-4 safe-area-top">
        <h1 className="text-2xl font-extrabold font-display text-foreground">
          Liga de <span className="text-gradient-gold">Clãs</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Estude e compita em equipe ⚔️</p>
      </div>

      <div className="px-5">
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList className="w-full">
            <TabsTrigger value="mine" className="flex-1">Meu Clã</TabsTrigger>
            <TabsTrigger value="explore" className="flex-1">Explorar</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-4 space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </>
            ) : !clan ? (
              <div className="space-y-4">
                <div className="glass-card p-6 text-center">
                  <Shield size={32} className="mx-auto text-secondary mb-2" />
                  <p className="font-bold text-foreground">Você ainda não tem clã</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {myApplication
                      ? 'Seu pedido de entrada está aguardando aprovação.'
                      : 'Crie o seu ou explore os clãs existentes.'}
                  </p>
                </div>
                {myApplication ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={busy === 'cancel'}
                    onClick={async () => {
                      setBusy('cancel');
                      const { error } = await supabase.from('clan_applications').delete().eq('id', myApplication.id);
                      setBusy(null);
                      if (error) return toast.error(errMsg(error));
                      toast.success('Pedido cancelado');
                      refresh();
                    }}
                  >
                    Cancelar pedido
                  </Button>
                ) : (
                  <CreateClanDialog displayName={displayName} onDone={refresh} />
                )}
                <Button variant="outline" className="w-full" onClick={() => changeTab('explore')}>
                  Explorar clãs
                </Button>
              </div>
            ) : (
              <>
                {/* Banner do clã */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center text-3xl mb-2">
                    {clan.emblem}
                  </div>
                  <h2 className="text-xl font-extrabold font-display text-foreground uppercase">{clan.name}</h2>
                  <p className="text-sm font-bold text-secondary">[{clan.tag}]</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {LEAGUES[clan.league]?.icon} {LEAGUES[clan.league]?.label ?? clan.league} • Nível {lvl.level}
                  </p>
                  <p className="text-sm font-bold text-gradient-gold mt-1">🔥 {clan.xp.toLocaleString('pt-BR')} XP</p>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden mt-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${lvl.progress}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full rounded-full bg-gradient-gold"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {lvl.current} / {lvl.need} XP para o nível {lvl.level + 1}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <Users size={12} className="inline mr-1" />
                    {clan.member_count} / {clan.max_members} membros
                  </p>
                  {clan.description && (
                    <p className="text-xs text-muted-foreground mt-2 italic">"{clan.description}"</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={share}>
                      <Share2 size={14} className="mr-1" /> Convidar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => changeTab('explore')}>
                      <Shield size={14} className="mr-1" /> Explorar
                    </Button>
                  </div>
                </motion.div>

                {/* Pedidos pendentes */}
                {canManage && applications.length > 0 && (
                  <div className="glass-card p-4 space-y-2">
                    <p className="font-bold text-foreground text-sm">Pedidos de entrada ({applications.length})</p>
                    {applications.map((a) => (
                      <div key={a.id} className="flex items-center gap-2">
                        <p className="flex-1 text-sm text-foreground truncate">{a.display_name || 'Jogador'}</p>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Aceitar"
                          disabled={busy === a.id}
                          onClick={() => act(a.id, 'accept_clan_application', { p_request_id: a.id }, 'Membro aceito!')}
                        >
                          <Check size={14} />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          aria-label="Recusar"
                          disabled={busy === a.id}
                          onClick={() => act(a.id, 'reject_clan_application', { p_request_id: a.id }, 'Pedido recusado')}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Membros */}
                <div className="glass-card p-4 space-y-3">
                  <p className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Users size={14} /> Membros
                  </p>
                  {sortedMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {m.display_name || 'Jogador'} {m.user_id === user?.id && <span className="text-[10px] text-muted-foreground">(você)</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {ROLE_LABEL[m.role]} • {m.xp_contributed.toLocaleString('pt-BR')} XP
                        </p>
                      </div>
                      {isLeader && m.user_id !== user?.id && (
                        <>
                          {m.role === 'member' ? (
                            <Button
                              size="icon" variant="outline" aria-label="Promover a vice-líder"
                              disabled={busy === m.id}
                              onClick={() => act(m.id, 'set_clan_member_role', { p_clan_id: clan.id, p_target: m.user_id, p_role: 'vice' }, 'Membro promovido')}
                            >
                              <ChevronUp size={14} />
                            </Button>
                          ) : m.role === 'vice' ? (
                            <>
                              <Button
                                size="icon" variant="outline" aria-label="Rebaixar a membro"
                                disabled={busy === m.id}
                                onClick={() => act(m.id, 'set_clan_member_role', { p_clan_id: clan.id, p_target: m.user_id, p_role: 'member' }, 'Membro rebaixado')}
                              >
                                <ChevronDown size={14} />
                              </Button>
                              <Button
                                size="icon" variant="outline" aria-label="Transferir liderança"
                                disabled={busy === m.id}
                                onClick={() => act(m.id, 'transfer_clan_lead', { p_clan_id: clan.id, p_new_leader: m.user_id }, 'Liderança transferida')}
                              >
                                <Crown size={14} />
                              </Button>
                            </>
                          ) : null}
                        </>
                      )}
                      {canManage && m.user_id !== user?.id && m.role !== 'leader' && (isLeader || m.role === 'member') && (
                        <Button
                          size="icon" variant="outline" aria-label="Remover do clã"
                          disabled={busy === m.id}
                          onClick={() => act(m.id, 'kick_clan_member_v2', { p_clan_id: clan.id, p_target: m.user_id }, 'Membro removido')}
                        >
                          <UserMinus size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Gerenciar */}
                <div className="glass-card p-4 space-y-2">
                  <p className="font-bold text-foreground text-sm flex items-center gap-2">
                    <Settings size={14} /> {isLeader ? 'Gerenciar clã' : 'Meu cargo'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {myRole ? ROLE_LABEL[myRole] : ''}
                    {isLeader && ' — você pode promover, remover, transferir liderança e excluir o clã.'}
                  </p>
                  {isLeader && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={busy === 'vis'}
                      onClick={() => act('vis', 'update_clan', {
                        p_clan_id: clan.id,
                        p_description: clan.description,
                        p_emblem: clan.emblem,
                        p_visibility: clan.visibility === 'public' ? 'private' : 'public',
                      }, 'Visibilidade atualizada')}
                    >
                      {clan.visibility === 'public' ? 'Tornar clã privado' : 'Tornar clã público'}
                    </Button>
                  )}
                  {!isLeader && (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={busy === 'leave'}
                      onClick={() => act('leave', 'leave_clan', {}, 'Você saiu do clã')}
                    >
                      <LogOut size={16} className="mr-2" /> Sair do clã
                    </Button>
                  )}
                  {isLeader && <DeleteClanDialog clanId={clan.id} clanName={clan.name} onDone={refresh} />}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="explore" className="mt-4 space-y-4">
            {!clan && (
              <JoinByCodeDialog displayName={displayName} onJoined={() => { refresh(); refreshInvites(); }} />
            )}
            <ExploreClans displayName={displayName} inClan={!!clan} onJoined={refresh} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
