import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Tournament {
  id: string;
  season_number: number;
  status: 'registration' | 'active' | 'finished';
  registration_start: string;
  registration_end: string;
  start_date: string;
  end_date: string;
  bracket_size: number;
  total_rounds: number;
  current_round: number;
  question_ids: number[];
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  round: number;
  match_index: number;
  player1_id: string | null;
  player2_id: string | null;
  player1_name: string;
  player2_name: string;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: string | null;
  status: 'pending' | 'finished' | 'bye';
  deadline: string | null;
}

export function useTournament() {
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: t } = await supabase
      .from('tournaments')
      .select('*')
      .neq('status', 'finished')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!t) {
      // Fallback: most recent finished
      const { data: last } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setTournament(last as any);
      setMatches([]);
      setRegistered(false);
      setLoading(false);
      return;
    }
    setTournament(t as any);

    const { data: ms } = await supabase
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', t.id)
      .order('round')
      .order('match_index');
    setMatches((ms as any) || []);

    if (user) {
      const { data: reg } = await supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', t.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setRegistered(!!reg);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime: subscribe as soon as we know the tournament id, with targeted handlers
  const matchesRef = useRef<TournamentMatch[]>([]);
  useEffect(() => { matchesRef.current = matches; }, [matches]);

  useEffect(() => {
    if (!tournament) return;
    const tid = tournament.id;
    const channel = supabase
      .channel(`tournament-${tid}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tid}` }, (payload) => {
        const updated = payload.new as TournamentMatch;
        const prev = matchesRef.current.find((m) => m.id === updated.id);
        setMatches((prevList) => prevList.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        // Notify the current user when their match resolves
        if (user && updated.status === 'finished' && prev?.status !== 'finished' &&
            (updated.player1_id === user.id || updated.player2_id === user.id)) {
          const won = updated.winner_id === user.id;
          if (won) toast.success('🏆 Você venceu a partida!');
          else toast.error('Você foi eliminado da partida.');
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tid}` }, (payload) => {
        const inserted = payload.new as TournamentMatch;
        setMatches((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted].sort((a, b) => a.round - b.round || a.match_index - b.match_index)));
        if (user && (inserted.player1_id === user.id || inserted.player2_id === user.id)) {
          toast.info('Nova partida disponível no torneio!');
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tournaments', filter: `id=eq.${tid}` }, (payload) => {
        setTournament((prev) => (prev ? { ...prev, ...(payload.new as Tournament) } : (payload.new as Tournament)));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournament?.id, user?.id]);

  return { tournament, matches, registered, loading, refresh: fetchAll };
}
