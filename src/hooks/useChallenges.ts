import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  challenge_type: string;
  target_value: number;
  reward_coins: number;
  week_start: string;
  week_end: string;
}

export interface ChallengeProgress {
  id: string;
  church_id: string;
  challenge_id: string;
  current_value: number;
  completed: boolean;
  completed_at: string | null;
}

export interface ChallengeWithProgress extends WeeklyChallenge {
  progress: ChallengeProgress | null;
}

export function useWeeklyChallenges(churchId: string | null) {
  const [challenges, setChallenges] = useState<ChallengeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChallenges = useCallback(async () => {
    if (!churchId) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Fetch active challenges
    const { data: activeChallenges } = await supabase
      .from('weekly_challenges')
      .select('*')
      .lte('week_start', today)
      .gte('week_end', today);

    if (!activeChallenges || activeChallenges.length === 0) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    // Fetch progress for this church
    const challengeIds = activeChallenges.map(c => c.id);
    const { data: progressData } = await supabase
      .from('church_challenge_progress')
      .select('*')
      .eq('church_id', churchId)
      .in('challenge_id', challengeIds);

    // Ensure progress entries exist (create if missing)
    const missingIds = challengeIds.filter(
      id => !progressData?.find(p => p.challenge_id === id)
    );

    if (missingIds.length > 0) {
      const newEntries = missingIds.map(cid => ({
        church_id: churchId,
        challenge_id: cid,
        current_value: 0,
      }));
      await supabase.from('church_challenge_progress').insert(newEntries);
    }

    // Re-fetch progress after potential inserts
    const { data: allProgress } = await supabase
      .from('church_challenge_progress')
      .select('*')
      .eq('church_id', churchId)
      .in('challenge_id', challengeIds);

    const merged: ChallengeWithProgress[] = activeChallenges.map(c => ({
      ...c,
      progress: allProgress?.find(p => p.challenge_id === c.id) || null,
    }));

    setChallenges(merged);
    setLoading(false);
  }, [churchId]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const contributeProgress = useCallback(async (
    challengeType: string,
    amount: number = 1
  ) => {
    if (!churchId) return;
    await supabase.rpc('contribute_challenge_progress', {
      p_church_id: churchId,
      p_challenge_type: challengeType,
      p_amount: amount,
    });
    // Refresh
    fetchChallenges();
  }, [churchId, fetchChallenges]);

  return { challenges, loading, fetchChallenges, contributeProgress };
}
