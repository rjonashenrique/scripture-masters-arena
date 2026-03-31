import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Crown, Users, Loader2, Skull, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateBattleCode, selectBattleQuestions } from '@/lib/battleUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

type RoomRow = {
  id: string;
  code: string;
  status: string;
  max_players: number;
  host_id: string;
};

type PlayerRow = {
  id: string;
  user_id: string;
  display_name: string;
  alive: boolean;
};

export default function BattleRoyaleLobbyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'waiting'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Jogador';
  const isHost = room?.host_id === user?.id;

  // Subscribe to room updates
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`br-room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_royale_rooms', filter: `id=eq.${room.id}` }, (payload) => {
        const data = payload.new as any;
        if (data.status === 'playing') {
          navigate(`/battle-royale/${room.id}`);
        }
        setRoom(data);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_royale_players', filter: `room_id=eq.${room.id}` }, () => {
        fetchPlayers(room.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  const fetchPlayers = async (roomId: string) => {
    const { data } = await supabase.from('battle_royale_players').select('id, user_id, display_name, alive').eq('room_id', roomId);
    if (data) setPlayers(data);
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    const code = generateBattleCode();
    const questionIds = selectBattleQuestions(30);

    const { data, error } = await supabase.from('battle_royale_rooms').insert({
      code,
      max_players: maxPlayers,
      question_ids: questionIds as any,
      host_id: user.id,
    }).select().single();

    if (error || !data) {
      toast.error('Erro ao criar sala');
      setLoading(false);
      return;
    }

    // Join as player
    await supabase.from('battle_royale_players').insert({
      room_id: data.id,
      user_id: user.id,
      display_name: displayName,
    });

    setRoom(data as any);
    await fetchPlayers(data.id);
    setMode('waiting');
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!user || !joinCode.trim()) {
      toast.error('Digite o código da sala!');
      return;
    }
    setLoading(true);

    const { data: roomData, error } = await supabase
      .from('battle_royale_rooms')
      .select()
      .eq('code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .single();

    if (error || !roomData) {
      toast.error('Sala não encontrada ou já iniciada');
      setLoading(false);
      return;
    }

    // Check if room is full
    const { count } = await supabase.from('battle_royale_players').select('*', { count: 'exact', head: true }).eq('room_id', roomData.id);
    if ((count || 0) >= roomData.max_players) {
      toast.error('Sala lotada!');
      setLoading(false);
      return;
    }

    // Check if already joined
    const { data: existing } = await supabase.from('battle_royale_players').select('id').eq('room_id', roomData.id).eq('user_id', user.id).maybeSingle();
    if (!existing) {
      await supabase.from('battle_royale_players').insert({
        room_id: roomData.id,
        user_id: user.id,
        display_name: displayName,
      });
    }

    setRoom(roomData as any);
    await fetchPlayers(roomData.id);
    setMode('waiting');
    setLoading(false);
  };

  const handleStart = async () => {
    if (!room || !isHost) return;
    if (players.length < 2) {
      toast.error('Mínimo 2 jogadores para iniciar!');
      return;
    }
    setLoading(true);
    const { error } = await supabase.rpc('start_battle_royale', { p_room_id: room.id });
    if (error) {
      toast.error('Erro ao iniciar');
      setLoading(false);
      return;
    }
    navigate(`/battle-royale/${room.id}`);
  };

  const copyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.code);
      toast.success('Código copiado!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 safe-area-top">
        <button onClick={() => mode === 'menu' ? navigate('/') : mode === 'waiting' ? setMode('menu') : setMode('menu')} className="text-muted-foreground mb-4">
          <ArrowLeft size={24} />
        </button>

        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center mb-4 shadow-lg">
            <Skull size={36} className="text-destructive-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold font-display text-foreground">Battle Royale</h1>
          <p className="text-sm text-muted-foreground mt-1">Errou? Eliminado! Último sobrevivente vence!</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div key="menu" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full glass-card p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive to-destructive/60 flex items-center justify-center">
                  <Crown size={24} className="text-destructive-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold font-display text-foreground">Criar Sala</p>
                  <p className="text-xs text-muted-foreground">Escolha 10 ou 30 jogadores</p>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full glass-card p-4 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center">
                  <Users size={24} className="text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-bold font-display text-foreground">Entrar na Sala</p>
                  <p className="text-xs text-muted-foreground">Use o código de um amigo</p>
                </div>
                <span className="text-muted-foreground">›</span>
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass-card p-4">
                <label className="text-xs font-semibold text-muted-foreground mb-3 block">Jogadores máximos</label>
                <div className="flex gap-3">
                  {[10, 30].map(n => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
                        maxPlayers === n
                          ? 'bg-gradient-to-br from-destructive to-destructive/60 text-destructive-foreground shadow-lg'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {n} <span className="text-xs font-normal">jogadores</span>
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-br from-destructive to-destructive/60 text-destructive-foreground font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Skull size={20} />}
                {loading ? 'Criando...' : 'Criar Sala'}
              </button>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass-card p-4">
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Código da sala</label>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="EX: ABC123"
                  maxLength={6}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm text-center tracking-[0.3em] font-bold placeholder:text-muted-foreground placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-destructive"
                />
              </div>
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-gold text-secondary-foreground font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
                {loading ? 'Entrando...' : 'Entrar na Sala'}
              </button>
            </motion.div>
          )}

          {mode === 'waiting' && room && (
            <motion.div key="waiting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass-card p-6 text-center">
                <button onClick={copyCode} className="flex items-center justify-center gap-3 mx-auto mb-4">
                  <span className="text-3xl font-extrabold tracking-[0.3em] text-gradient-gold">{room.code}</span>
                  <Copy size={20} className="text-muted-foreground" />
                </button>
                <p className="text-xs text-muted-foreground">Compartilhe o código para seus amigos entrarem</p>
              </div>

              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold font-display text-foreground text-sm">Jogadores</h3>
                  <span className="text-xs text-muted-foreground">{players.length}/{room.max_players}</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {players.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">{i + 1}</span>
                      <span className="text-sm font-medium text-foreground flex-1">{p.display_name}</span>
                      {p.user_id === room.host_id && <Crown size={14} className="text-secondary" />}
                    </div>
                  ))}
                </div>
              </div>

              {isHost ? (
                <button
                  onClick={handleStart}
                  disabled={loading || players.length < 2}
                  className="w-full py-4 rounded-xl bg-gradient-to-br from-destructive to-destructive/60 text-destructive-foreground font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Skull size={20} />}
                  {players.length < 2 ? 'Aguardando jogadores...' : 'Iniciar Battle Royale!'}
                </button>
              ) : (
                <div className="text-center py-4">
                  <Loader2 size={24} className="text-destructive animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aguardando o host iniciar...</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules */}
        {mode !== 'waiting' && (
          <div className="glass-card p-4 mt-6">
            <h3 className="font-bold font-display text-foreground mb-3 text-sm">Como funciona</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-destructive">💀</span> Errou uma pergunta? Eliminado!</li>
              <li className="flex items-start gap-2"><span className="text-destructive">⏱️</span> 15 segundos por pergunta</li>
              <li className="flex items-start gap-2"><span className="text-destructive">🏆</span> Último sobrevivente vence!</li>
              <li className="flex items-start gap-2"><span className="text-destructive">👥</span> 10 ou 30 jogadores por sala</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
