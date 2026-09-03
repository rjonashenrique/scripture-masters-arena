import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { LEAGUES, clanLevelInfo } from '@/hooks/useClan';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AuthPage from '@/pages/AuthPage';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

export interface InvitePreview {
  valid: boolean;
  reason: string;
  invited_by_name: string;
  expires_at: string;
  clan: {
    id: string; name: string; tag: string; emblem: string; description: string;
    league: string; level: number; xp: number; member_count: number; max_members: number;
  };
}

export function usePreviewInvite(token?: string, code?: string) {
  const [data, setData] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!token && !code) return;
    setLoading(true);
    rpc('preview_clan_invite', { p_token: token ?? null, p_code: code ?? null }).then(({ data }: any) => {
      if (!active) return;
      setData(data as InvitePreview);
      setLoading(false);
    });
    return () => { active = false; };
  }, [token, code]);

  return { data, loading };
}

export function ClanInviteCard({
  preview, onAccept, onDecline, busy, acceptLabel = '⚔️ Entrar no Clã',
}: {
  preview: InvitePreview;
  onAccept: () => void;
  onDecline: () => void;
  busy?: boolean;
  acceptLabel?: string;
}) {
  const c = preview.clan;
  const lvl = clanLevelInfo(c.xp);
  const full = c.member_count >= Math.min(c.max_members, 20);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-primary flex items-center justify-center text-4xl mb-3">
        {c.emblem}
      </div>
      <h2 className="text-xl font-extrabold font-display text-foreground uppercase">{c.name}</h2>
      <p className="text-sm font-bold text-secondary">[{c.tag}]</p>
      <p className="text-xs text-muted-foreground mt-2">
        🏆 {LEAGUES[c.league]?.label ?? c.league}
      </p>
      <p className="text-xs text-muted-foreground">⭐ Nível {lvl.level}</p>
      <p className="text-xs text-muted-foreground">
        <Users size={12} className="inline mr-1" />
        {c.member_count}/{Math.min(c.max_members, 20)} membros
      </p>
      {c.description && <p className="text-xs text-muted-foreground mt-2 italic">"{c.description}"</p>}
      <p className="text-sm text-foreground font-semibold mt-4">
        {preview.invited_by_name || 'Um jogador'} convidou você para fazer parte deste clã.
      </p>
      {full && <p className="text-xs text-destructive mt-2">⚠️ Este clã atingiu o limite de 20 membros.</p>}
      <div className="space-y-2 mt-5">
        <Button className="w-full h-12 font-bold" disabled={busy || full} onClick={onAccept}>
          {busy && <Loader2 size={16} className="mr-2 animate-spin" />} {acceptLabel}
        </Button>
        <Button variant="outline" className="w-full" onClick={onDecline}>Agora não</Button>
      </div>
    </motion.div>
  );
}

export function ClanWelcome({ clanName, onGo }: { clanName: string; onGo: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 text-center">
      <p className="text-4xl mb-2">🎉</p>
      <h2 className="text-xl font-extrabold font-display text-foreground">Bem-vindo ao {clanName}!</h2>
      <p className="text-sm text-muted-foreground mt-2">
        Prepare-se para estudar a Palavra, ganhar XP e lutar pelo seu clã. ⚔️📖
      </p>
      <Button className="w-full h-12 font-bold mt-5" onClick={onGo}>Ir para Meu Clã</Button>
    </motion.div>
  );
}

export default function ClanInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data, loading } = usePreviewInvite(token);
  const [busy, setBusy] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (user && showAuth) setShowAuth(false);
  }, [user, showAuth]);

  if (showAuth && !user) return <AuthPage />;

  const accept = async () => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    setBusy(true);
    const { error } = await rpc('accept_clan_invite', {
      p_token: token,
      p_code: null,
      p_display_name: profile?.display_name ?? null,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    setJoined(true);
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-14 safe-area-top">
      <h1 className="text-2xl font-extrabold font-display text-foreground text-center mb-5">
        ⚔️ Convite para <span className="text-gradient-gold">Clã</span>
      </h1>

      {loading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : !data || !data.clan ? (
        <div className="glass-card p-6 text-center">
          <p className="font-bold text-foreground">Convite inválido</p>
          <p className="text-xs text-muted-foreground mt-1">Este link não existe ou foi removido.</p>
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/clans')}>Ver clãs</Button>
        </div>
      ) : joined ? (
        <ClanWelcome clanName={data.clan.name} onGo={() => navigate('/clans')} />
      ) : !data.valid ? (
        <div className="glass-card p-6 text-center">
          <p className="font-bold text-foreground">
            {data.reason === 'expired' ? 'Convite expirado' : 'Convite indisponível'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Peça um novo convite ao líder do clã.</p>
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/clans')}>Ver clãs</Button>
        </div>
      ) : (
        <ClanInviteCard
          preview={data}
          busy={busy}
          onAccept={accept}
          onDecline={() => navigate('/clans')}
          acceptLabel={user ? '⚔️ Entrar no Clã' : '⚔️ Entrar para aceitar'}
        />
      )}
    </div>
  );
}
