import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { clanRpc } from '@/hooks/useClanInvites';
import { ClanInviteCard, ClanWelcome, type InvitePreview } from '@/pages/ClanInvitePage';

function errMsg(e: unknown) {
  const m = (e as { message?: string })?.message ?? 'Algo deu errado';
  return m.replace(/^.*?:\s*/, '') || m;
}

export default function JoinByCodeDialog({
  displayName, disabled, onJoined,
}: {
  displayName: string;
  disabled?: boolean;
  onJoined: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setCode(''); setPreview(null); setJoined(null); };

  const check = async () => {
    setBusy(true);
    const { data, error } = await clanRpc('preview_clan_invite', { p_token: null, p_code: code.trim().toUpperCase() });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    const p = data as InvitePreview;
    if (!p || !p.clan) return toast.error('Código não encontrado');
    if (!p.valid) return toast.error(p.reason === 'expired' ? 'Este convite expirou' : 'Convite indisponível');
    setPreview(p);
  };

  const accept = async () => {
    if (!preview) return;
    setBusy(true);
    const { error } = await clanRpc('accept_clan_invite', {
      p_token: null, p_code: code.trim().toUpperCase(), p_display_name: displayName, p_invite_id: null,
    });
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    setJoined(preview.clan.name);
    onJoined();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" disabled={disabled}>
          <KeyRound size={16} className="mr-2" /> Entrar com código
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entrar com código</DialogTitle>
          <DialogDescription>Use o código de convite que você recebeu.</DialogDescription>
        </DialogHeader>

        {joined ? (
          <ClanWelcome clanName={joined} onGo={() => setOpen(false)} />
        ) : preview ? (
          <ClanInviteCard preview={preview} busy={busy} onAccept={accept} onDecline={() => setPreview(null)} />
        ) : (
          <>
            <div>
              <Label htmlFor="invite-code">Digite o código de convite</Label>
              <Input
                id="invite-code"
                value={code}
                maxLength={8}
                placeholder="FE7K92"
                className="tracking-widest uppercase"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            <DialogFooter>
              <Button className="w-full" disabled={code.trim().length < 4 || busy} onClick={check}>
                {busy && <Loader2 size={16} className="mr-2 animate-spin" />} Continuar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
