import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Users, Clock, Crown } from 'lucide-react';
import { useTournament, TournamentMatch } from '@/hooks/useTournament';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { roundName, tournamentPhaseLabel, formatCountdown } from '@/lib/tournament';
import { useEffect, useState } from 'react';

export default function TournamentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tournament, matches, registered, loading, refresh } = useTournament();
  const [, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(i);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-gradient-hero flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-hero pb-24 px-5 pt-12">
        <button onClick={() => navigate('/')} className="text-muted-foreground mb-4"><ArrowLeft size={24} /></button>
        <div className="glass-card p-6 text-center">
          <Trophy className="mx-auto text-secondary mb-3" size={40} />
          <p className="text-foreground font-bold mb-2">Nenhum torneio ativo</p>
          <p className="text-xs text-muted-foreground">A próxima temporada começa toda segunda-feira.</p>
        </div>
      </div>
    );
  }

  const handleRegister = async () => {
    const { error } = await supabase.rpc('register_tournament', {
      p_tournament_id: tournament.id,
      p_display_name: profile?.display_name || 'Jogador',
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Inscrito! Boa sorte 🏆');
      refresh();
    }
  };

  const myMatch = matches.find(
    (m) => m.round === tournament.current_round && m.status === 'pending' &&
      (m.player1_id === user?.id || m.player2_id === user?.id)
  );
  const myAlreadyPlayed = myMatch && (
    (myMatch.player1_id === user?.id && myMatch.player1_score != null) ||
    (myMatch.player2_id === user?.id && myMatch.player2_score != null)
  );

  // Most recent finished match involving the user — used for live result banner
  const myLastFinished = [...matches]
    .filter((m) => m.status === 'finished' && (m.player1_id === user?.id || m.player2_id === user?.id))
    .sort((a, b) => b.round - a.round || b.match_index - a.match_index)[0];
  const myLastWon = myLastFinished?.winner_id === user?.id;
  const opponentName = myLastFinished
    ? (myLastFinished.player1_id === user?.id ? myLastFinished.player2_name : myLastFinished.player1_name)
    : '';
  const myLastScore = myLastFinished
    ? (myLastFinished.player1_id === user?.id ? myLastFinished.player1_score : myLastFinished.player2_score)
    : null;
  const oppLastScore = myLastFinished
    ? (myLastFinished.player1_id === user?.id ? myLastFinished.player2_score : myLastFinished.player1_score)
    : null;

  const rounds: Record<number, TournamentMatch[]> = {};
  matches.forEach((m) => {
    rounds[m.round] = rounds[m.round] || [];
    rounds[m.round].push(m);
  });

  const nextDeadline = tournament.status === 'registration'
    ? tournament.registration_end
    : matches.find((m) => m.round === tournament.current_round)?.deadline;

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 pb-4 safe-area-top flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-muted-foreground"><ArrowLeft size={24} /></button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold font-display text-foreground">
            Torneio <span className="text-gradient-gold">Semanal</span>
          </h1>
          <p className="text-xs text-muted-foreground">Temporada #{tournament.season_number}</p>
        </div>
      </div>

      <div className="px-5 space-y-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-bold text-foreground">{tournamentPhaseLabel(tournament.status, tournament.current_round, tournament.total_rounds)}</p>
            </div>
            {nextDeadline && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock size={12} /> {tournament.status === 'registration' ? 'Fecha em' : 'Próxima fase'}</p>
                <p className="font-bold text-secondary">{formatCountdown(nextDeadline)}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/40">
            <div><p className="text-[10px] text-muted-foreground">🥇 Campeão</p><p className="text-sm font-bold text-foreground">500 🪙</p></div>
            <div><p className="text-[10px] text-muted-foreground">🥈 Vice</p><p className="text-sm font-bold text-foreground">250 🪙</p></div>
            <div><p className="text-[10px] text-muted-foreground">🥉 Semis</p><p className="text-sm font-bold text-foreground">100 🪙</p></div>
          </div>
        </motion.div>

        {/* Action area */}
        {tournament.status === 'registration' && !registered && (
          <button
            onClick={handleRegister}
            className="w-full py-4 rounded-xl bg-gradient-gold text-secondary-foreground font-bold shadow-lg active:scale-[0.98] transition"
          >
            Inscrever-se no Torneio
          </button>
        )}
        {tournament.status === 'registration' && registered && (
          <div className="glass-card p-4 text-center">
            <Users className="mx-auto text-secondary mb-1" size={20} />
            <p className="font-bold text-foreground">Inscrito!</p>
            <p className="text-xs text-muted-foreground">Aguarde o início do chaveamento.</p>
          </div>
        )}
        {tournament.status === 'active' && myMatch && !myAlreadyPlayed && (
          <button
            onClick={() => navigate(`/tournament/match/${myMatch.id}`)}
            className="w-full py-4 rounded-xl bg-gradient-primary text-primary-foreground font-bold shadow-lg active:scale-[0.98] transition"
          >
            Jogar minha partida — {roundName(myMatch.round, tournament.total_rounds)}
          </button>
        )}
        {tournament.status === 'active' && myMatch && myAlreadyPlayed && (
          <div className="glass-card p-4 text-center">
            <p className="font-bold text-foreground">Sua partida foi enviada</p>
            <p className="text-xs text-muted-foreground">Aguardando adversário ou fim da rodada.</p>
          </div>
        )}

        {/* Bracket */}
        {Object.keys(rounds).length > 0 && (
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold font-display text-foreground">Chaveamento</h2>
            {Object.keys(rounds).map((r) => {
              const round = Number(r);
              return (
                <div key={r} className="glass-card p-3">
                  <p className="text-xs font-bold text-secondary mb-2">{roundName(round, tournament.total_rounds)}</p>
                  <div className="space-y-2">
                    {rounds[round].map((m) => (
                      <MatchRow key={m.id} match={m} userId={user?.id} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchRow({ match, userId }: { match: TournamentMatch; userId?: string }) {
  const isMine = match.player1_id === userId || match.player2_id === userId;
  const winner1 = match.winner_id && match.winner_id === match.player1_id;
  const winner2 = match.winner_id && match.winner_id === match.player2_id;
  return (
    <div className={`rounded-lg overflow-hidden border ${isMine ? 'border-secondary' : 'border-border/40'}`}>
      <PlayerLine name={match.player1_name} score={match.player1_score} winner={!!winner1} self={match.player1_id === userId} />
      <div className="h-px bg-border/40" />
      <PlayerLine name={match.player2_name} score={match.player2_score} winner={!!winner2} self={match.player2_id === userId} />
    </div>
  );
}

function PlayerLine({ name, score, winner, self }: { name: string; score: number | null; winner: boolean; self: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 ${winner ? 'bg-secondary/10' : ''}`}>
      <div className="flex items-center gap-2 min-w-0">
        {winner && <Crown size={14} className="text-secondary shrink-0" />}
        <span className={`text-sm truncate ${self ? 'font-bold text-foreground' : 'text-foreground/90'}`}>{name || '—'}</span>
      </div>
      <span className={`text-sm font-bold ${winner ? 'text-secondary' : 'text-muted-foreground'}`}>
        {score ?? '–'}
      </span>
    </div>
  );
}
