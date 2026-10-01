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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const rpc = (name: string, args?: Record<string, unknown>) => (supabase.rpc as any)(name, args);

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

export interface InvitePreview {
  valid: boolean;
  reason: string;
  invite_id?: string;
  directed?: boolean;
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
        <Button variant="outline" className="w-full" onClick={onDecline}>Recusar Convite</Button>
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

const PENDING_KEY = 'pending_clan_invite';

const REASON_TEXT: Record<string, { title: string; hint: string }> = {
  not_found: { title: '⚠️ Convite inválido', hint: 'Este link não é válido ou não existe.' },
  wrong_user: { title: '🚫 Convite não disponível', hint: 'Este convite foi enviado para outra conta.' },
  auth_required: { title: '🔐 Entre na sua conta', hint: 'Entre na sua conta para visualizar este convite.' },
  clan_missing: { title: 'Clã indisponível', hint: 'Este clã não está mais ativo.' },
  expired: { title: '⌛ Convite expirado', hint: 'Peça ao líder ou vice-líder um novo convite.' },
  cancelled: { title: '🚫 Convite cancelado', hint: 'Este convite não está mais disponível.' },
  declined: { title: 'Convite recusado', hint: 'Este convite já foi recusado.' },
  accepted: { title: 'Convite já utilizado', hint: 'Este convite já foi aceito por alguém.' },
};

export default function ClanInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data, loading } = usePreviewInvite(token);
  const [busy, setBusy] = useState(false);
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Guarda o convite para não perdê-lo durante o login
  useEffect(() => {
    if (token) localStorage.setItem(PENDING_KEY, token);
  }, [token]);

  // Já pertence a um clã?
  useEffect(() => {
    if (!user) return;
    supabase
      .from('clan_members')
      .select('clan_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: m }) => setAlreadyMember(!!m));
  }, [user]);

  const accept = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await rpc('accept_clan_invite', {
      p_token: token,
      p_code: null,
      p_display_name: profile?.display_name ?? null,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    localStorage.removeItem(PENDING_KEY);
    setJoined(true);
  };

  const decline = async () => {
    setConfirmDecline(false);
    if (data?.directed && data.invite_id) {
      const { error } = await rpc('decline_clan_invite', { p_invite_id: data.invite_id });
      if (error) return toast.error(errMsg(error));
    }
    localStorage.removeItem(PENDING_KEY);
    toast.success('Convite recusado');
    navigate('/clans');
  };

  const Info = ({ title, hint }: { title: string; hint: string }) => (
    <div className="glass-card p-6 text-center">
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/clans')}>
        Ver clãs
      </Button>
    </div>
  );

  const full = data?.clan ? data.clan.member_count >= Math.min(data.clan.max_members, 20) : false;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-14 safe-area-top">
      <h1 className="text-2xl font-extrabold font-display text-foreground text-center mb-5">
        ⚔️ Convite para <span className="text-gradient-gold">Clã</span>
      </h1>

      {loading ? (
        <div className="glass-card p-6 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Carregando convite...</p>
          <Skeleton className="h-48 w-full rounded-xl mt-4" />
        </div>
      ) : !data || !data.clan ? (
        <Info {...REASON_TEXT.not_found} />
      ) : joined ? (
        <ClanWelcome clanName={data.clan.name} onGo={() => navigate('/clans')} />
      ) : !data.valid ? (
        <Info {...(REASON_TEXT[data.reason] ?? REASON_TEXT.not_found)} />
      ) : alreadyMember ? (
        <Info title="Você já faz parte de um clã" hint="Saia do clã atual para aceitar outro convite." />
      ) : full ? (
        <Info title="Clã cheio" hint="Este clã atingiu o limite de membros." />
      ) : (
        <ClanInviteCard
          preview={data}
          busy={busy}
          onAccept={accept}
          onDecline={() => setConfirmDecline(true)}
        />
      )}

      <AlertDialog open={confirmDecline} onOpenChange={setConfirmDecline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar convite</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja recusar este convite?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={decline}>Sim, recusar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

