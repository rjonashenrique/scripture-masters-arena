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

  // Realtime
  useEffect(() => {
    if (!tournament) return;
    const channel = supabase
      .channel(`tournament-${tournament.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tournament.id}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournament.id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournament?.id, fetchAll]);

  return { tournament, matches, registered, loading, refresh: fetchAll };
}
