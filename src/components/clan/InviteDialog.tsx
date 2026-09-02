import { useEffect, useState } from 'react';
import { Search, Copy, Share2, Link2, Loader2, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { clanRpc, inviteUrl, playerLevel, type PlayerResult } from '@/hooks/useClanInvites';

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clanId: string;
  clanName: string;
  onChanged?: () => void;
}

export default function InviteDialog({ open, onOpenChange, clanId, clanName, onChanged }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [share, setShare] = useState<{ token: string; code: string } | null>(null);
  const [genBusy, setGenBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await clanRpc('search_players', { p_query: query.trim(), p_limit: 20 });
      if (!active) return;
      setResults((data as PlayerResult[]) ?? []);
      setSearching(false);
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, open]);

  const invite = async (p: PlayerResult) => {
    setBusy(p.id);
    const { error } = await clanRpc('create_clan_invite', { p_clan_id: clanId, p_invited_user_id: p.id });
    setBusy(null);
    if (error) return toast.error(errMsg(error));
    setSent((s) => ({ ...s, [p.id]: true }));
    toast.success('✓ Convite enviado');
    onChanged?.();
  };

  const ensureShareInvite = async () => {
    if (share) return share;
    setGenBusy(true);
    const { data, error } = await clanRpc('create_clan_invite', { p_clan_id: clanId });
    setGenBusy(false);
    if (error) {
      toast.error(errMsg(error));
      return null;
    }
    const s = { token: (data as any).token as string, code: (data as any).code as string };
    setShare(s);
    onChanged?.();
    return s;
  };

  const copy = async (kind: 'link' | 'code') => {
    const s = await ensureShareInvite();
    if (!s) return;
    const value = kind === 'link' ? inviteUrl(s.token) : s.code;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(kind === 'link' ? 'Link copiado!' : 'Código copiado!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  const nativeShare = async () => {
    const s = await ensureShareInvite();
    if (!s) return;
    const url = inviteUrl(s.token);
    const text = `Venha lutar comigo na Liga de Clãs Bíblicos! Entre no clã ${clanName} — código ${s.code}`;
    try {
      if (navigator.share) await navigator.share({ title: clanName, text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success('Convite copiado!');
      }
    } catch {
      /* cancelado */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>👥 Convidar</DialogTitle>
          <DialogDescription>Chame jogadores para {clanName}.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList className="w-full">
            <TabsTrigger value="search" className="flex-1">🔎 Jogadores</TabsTrigger>
            <TabsTrigger value="friends" className="flex-1">🤝 Amigos</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-3 space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar jogador pelo nome"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
              {searching ? (
                <>
                  <Skeleton className="h-14 w-full rounded-xl" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">Nenhum jogador encontrado.</p>
              ) : (
                results.map((p) => {
                  const done = sent[p.id] || p.invited;
                  return (
                    <div key={p.id} className="glass-card p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-base shrink-0 overflow-hidden">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                        ) : (
                          (p.display_name || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{p.display_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          @{(p.display_name || 'jogador').toLowerCase().replace(/\s+/g, '')}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          ⭐ Nível {playerLevel(p.total_points)} • {p.in_clan ? 'Já tem clã' : 'Sem clã'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={done ? 'outline' : 'default'}
                        disabled={p.in_clan || done || busy === p.id}
                        onClick={() => invite(p)}
                      >
                        {busy === p.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : done ? (
                          <><Check size={14} className="mr-1" /> Enviado</>
                        ) : (
                          <><UserPlus size={14} className="mr-1" /> Convidar</>
                        )}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="friends" className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              Convide seus amigos para lutar ao seu lado na Liga de Clãs Bíblicos.
            </p>
            {share && (
              <div className="glass-card p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Código do clã</p>
                <p className="text-2xl font-extrabold tracking-widest text-gradient-gold">{share.code}</p>
                <p className="text-[10px] text-muted-foreground break-all">{inviteUrl(share.token)}</p>
                <p className="text-[10px] text-muted-foreground">Válido por 7 dias.</p>
              </div>
            )}
            <Button variant="outline" className="w-full" disabled={genBusy} onClick={() => copy('link')}>
              {genBusy ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Link2 size={16} className="mr-2" />}
              🔗 Copiar link
            </Button>
            <Button variant="outline" className="w-full" disabled={genBusy} onClick={() => copy('code')}>
              <Copy size={16} className="mr-2" /> 📋 Copiar código
            </Button>
            <Button className="w-full" disabled={genBusy} onClick={nativeShare}>
              <Share2 size={16} className="mr-2" /> 📲 Compartilhar convite
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
