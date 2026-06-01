import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, XCircle, Skull, Users, Trophy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getQuestionById } from '@/lib/battleUtils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type RoomRow = {
  id: string; code: string; status: string; max_players: number;
  current_question: number; question_ids: number[]; host_id: string;
};
type PlayerRow = {
  id: string; user_id: string; display_name: string;
  alive: boolean; eliminated_at_question: number | null; score: number;
};

export default function BattleRoyaleGamePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [myQuestion, setMyQuestion] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [eliminated, setEliminated] = useState(false);
  const [waitingNext, setWaitingNext] = useState(false);

  const isHost = room?.host_id === user?.id;
  const alivePlayers = players.filter(p => p.alive);
  const me = players.find(p => p.user_id === user?.id);

  // Fetch initial data
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      const { data: roomData } = await supabase.from('battle_royale_rooms').select().eq('id', id).single();
      if (roomData) {
        setRoom({ ...roomData, question_ids: (roomData.question_ids || []) as number[] });
        setMyQuestion(roomData.current_question);
      }
      const { data: playersData } = await supabase.from('battle_royale_players').select('id, user_id, display_name, alive, eliminated_at_question, score').eq('room_id', id);
      if (playersData) setPlayers(playersData);
    };
    fetchData();
  }, [id]);

  // Realtime subscriptions
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`br-game-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battle_royale_rooms', filter: `id=eq.${id}` }, (payload) => {
        const data = payload.new as any;
        const updated = { ...data, question_ids: (data.question_ids || []) as number[] };
        setRoom(updated);
        if (data.status === 'playing' && !eliminated) {
          setMyQuestion(data.current_question);
          setSelected(null);
          setShowResult(false);
          setWaitingNext(false);
          setTimeLeft(15);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'battle_royale_players', filter: `room_id=eq.${id}` }, () => {
        supabase.from('battle_royale_players').select('id, user_id, display_name, alive, eliminated_at_question, score').eq('room_id', id).then(({ data }) => {
          if (data) {
            setPlayers(data);
            const myData = data.find(p => p.user_id === user?.id);
            if (myData && !myData.alive) setEliminated(true);
          }
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user?.id, eliminated]);

  // Timer
  useEffect(() => {
    if (!room || room.status !== 'playing' || showResult || eliminated || waitingNext) return;
    setTimeLeft(15);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [myQuestion, room?.status, showResult, eliminated, waitingNext]);

  const handleTimeout = useCallback(() => {
    if (showResult || eliminated) return;
    setSelected(-1);
    setShowResult(true);
    submitAnswer(-1);
  }, [showResult, eliminated, myQuestion]);

  // The server verifies the answer against the stored correct answer.
  const submitAnswer = async (answerIndex: number) => {
    if (!room || !id) return;
    await supabase.rpc('submit_battle_royale_answer', {
      p_room_id: id,
      p_answer: answerIndex,
    });
  };

  const handleSelect = (optionIndex: number) => {
    if (showResult || !room || eliminated) return;
    const q = getQuestionById(room.question_ids[myQuestion]);
    if (!q) return;
    const correct = optionIndex === q.correct;
    setSelected(optionIndex);
    setShowResult(true);
    submitAnswer(optionIndex);
    if (!correct) setEliminated(true);
  };

  const handleNextReady = async () => {
    setWaitingNext(true);
    // Host advances the room
    if (isHost && room) {
      // Small delay so other players can see result
      setTimeout(async () => {
        await supabase.rpc('advance_battle_royale', { p_room_id: room.id });
      }, 2000);
    }
  };

  // Loading
  if (!room || !room.question_ids.length) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Loader2 size={32} className="text-destructive animate-spin" />
      </div>
    );
  }

  // Finished screen
  if (room.status === 'finished') {
    const sorted = [...players].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.score - a.score;
    });
    const winner = sorted[0];
    const myRank = sorted.findIndex(p => p.user_id === user?.id) + 1;

    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-card p-8 text-center w-full max-w-sm">
          <div className="text-6xl mb-4">{myRank === 1 ? '🏆' : myRank <= 3 ? '🥈' : '💀'}</div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-1">
            {myRank === 1 ? 'Você Venceu!' : `${myRank}º Lugar`}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {winner && myRank !== 1 ? `Vencedor: ${winner.display_name}` : 'Último sobrevivente!'}
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto mb-6">
            {sorted.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg ${p.user_id === user?.id ? 'bg-primary/20 border border-primary/30' : 'bg-muted/30'}`}>
                <span className="w-6 text-xs font-bold text-muted-foreground">{i + 1}º</span>
                <span className={`text-sm font-medium flex-1 ${p.alive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                  {p.display_name}
                </span>
                <span className="text-xs font-bold text-secondary">{p.score}pts</span>
                {!p.alive && <Skull size={12} className="text-destructive" />}
                {i === 0 && <Trophy size={14} className="text-secondary" />}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <button onClick={() => navigate('/battle-royale')} className="w-full py-3 rounded-xl bg-gradient-to-br from-destructive to-destructive/60 text-destructive-foreground font-bold">
              Jogar Novamente
            </button>
            <button onClick={() => navigate('/')} className="w-full py-3 rounded-xl bg-muted text-foreground font-bold">
              Voltar ao Início
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Eliminated screen
  if (eliminated) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-card p-8 text-center w-full max-w-sm">
          <motion.div initial={{ rotateZ: 0 }} animate={{ rotateZ: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
            <Skull size={64} className="text-destructive mx-auto mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold font-display text-foreground mb-2">Eliminado!</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Eliminado na pergunta {(me?.eliminated_at_question ?? 0) + 1} • {me?.score ?? 0} pts
          </p>
          <div className="glass-card p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Sobreviventes</span>
              <span className="text-sm font-bold text-foreground">{alivePlayers.length}/{players.length}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {players.map(p => (
                <span key={p.id} className={`text-[10px] px-2 py-0.5 rounded-full ${p.alive ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                  {p.display_name}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Aguardando o jogo terminar...</p>
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground underline">
            Sair
          </button>
        </motion.div>
      </div>
    );
  }

  // Waiting for next question
  if (waitingNext) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-8 text-center w-full max-w-sm">
          <Loader2 size={32} className="text-destructive animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-bold font-display text-foreground mb-2">Próxima pergunta...</h2>
          <div className="flex items-center justify-center gap-2">
            <Users size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{alivePlayers.length} sobreviventes</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const q = getQuestionById(room.question_ids[myQuestion]);
  if (!q) return null;
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 safe-area-top">
        <div className="flex items-center gap-2">
          <Skull size={16} className="text-destructive" />
          <span className="text-xs font-bold text-foreground">Pergunta {myQuestion + 1}/{room.question_ids.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{alivePlayers.length} vivos</span>
        </div>
        <span className="text-xs font-bold text-secondary">{me?.score ?? 0} pts</span>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-2">
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-destructive transition-all"
            style={{ width: `${((myQuestion + 1) / room.question_ids.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Alive indicator */}
      <div className="px-5 pb-2">
        <div className="flex gap-0.5">
          {players.map(p => (
            <div
              key={p.id}
              className={`h-1 flex-1 rounded-full transition-all ${p.alive ? 'bg-success' : 'bg-destructive/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Timer */}
      {!showResult && (
        <div className="px-5 pb-2 flex items-center gap-2">
          <Clock size={16} className={timeLeft <= 3 ? 'text-destructive animate-pulse' : 'text-secondary'} />
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${timeLeft <= 3 ? 'bg-destructive' : 'bg-gradient-gold'}`}
              animate={{ width: `${(timeLeft / 15) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className={`text-sm font-bold ${timeLeft <= 3 ? 'text-destructive' : 'text-secondary'}`}>
            {timeLeft}s
          </span>
        </div>
      )}

      {/* Question */}
      <div className="flex-1 px-5 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={myQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                {q.category}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                q.difficulty === 'easy' ? 'bg-success/10 text-success' :
                q.difficulty === 'medium' ? 'bg-secondary/10 text-secondary' :
                'bg-destructive/10 text-destructive'
              }`}>
                {q.difficulty === 'easy' ? 'Fácil' : q.difficulty === 'medium' ? 'Médio' : 'Difícil'}
              </span>
            </div>
            <h2 className="text-lg font-bold font-display text-foreground mb-6 leading-snug">{q.question}</h2>

            <div className="space-y-3">
              {q.options.map((option, i) => {
                let bg = 'glass-card';
                let border = '';
                if (showResult) {
                  if (i === q.correct) {
                    bg = 'bg-success/20 border-success'; border = 'border';
                  } else if (i === selected && i !== q.correct) {
                    bg = 'bg-destructive/20 border-destructive'; border = 'border';
                  }
                }
                return (
                  <motion.button
                    key={i}
                    whileTap={!showResult ? { scale: 0.97 } : {}}
                    onClick={() => handleSelect(i)}
                    className={`w-full p-4 rounded-xl text-left flex items-center gap-3 ${bg} ${border} transition-colors`}
                  >
                    <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground shrink-0">
                      {optionLetters[i]}
                    </span>
                    <span className="text-sm font-medium text-foreground flex-1">{option}</span>
                    {showResult && i === q.correct && <CheckCircle2 size={20} className="text-success shrink-0" />}
                    {showResult && i === selected && i !== q.correct && <XCircle size={20} className="text-destructive shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            {showResult && !eliminated && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 glass-card p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">📖 {q.explanation}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {showResult && !eliminated && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-4">
            <button
              onClick={handleNextReady}
              className="w-full py-4 rounded-xl bg-gradient-to-br from-destructive to-destructive/60 text-destructive-foreground font-bold text-base"
            >
              Próxima Pergunta
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
