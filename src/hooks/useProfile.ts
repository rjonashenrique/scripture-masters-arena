import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerStats, getStats, saveStats } from '@/lib/gameStore';

export interface Profile {
  id: string;
  display_name: string;
  total_answered: number;
  total_correct: number;
  total_points: number;
  best_streak: number;
  current_streak: number;
  streak_days: number;
  last_play_date: string;
  easy_answered: number;
  easy_correct: number;
  medium_answered: number;
  medium_correct: number;
  hard_answered: number;
  hard_correct: number;
  total_time_ms: number;
  coins: number;
  achievements: string[];
  completed_lessons: number[];
  titles?: string[];
  active_title?: string;
}

function statsToProfile(stats: PlayerStats): Partial<Profile> {
  return {
    total_answered: stats.totalAnswered,
    total_correct: stats.totalCorrect,
    total_points: stats.totalPoints,
    best_streak: stats.bestStreak,
    current_streak: stats.currentStreak,
    streak_days: stats.streakDays,
    last_play_date: stats.lastPlayDate,
    easy_answered: stats.easyAnswered,
    easy_correct: stats.easyCorrect,
    medium_answered: stats.mediumAnswered,
    medium_correct: stats.mediumCorrect,
    hard_answered: stats.hardAnswered,
    hard_correct: stats.hardCorrect,
    total_time_ms: stats.totalTimeMs,
    coins: stats.coins,
    achievements: stats.achievements,
    completed_lessons: stats.completedLessons,
  };
}

function profileToStats(profile: Profile): PlayerStats {
  return {
    totalAnswered: profile.total_answered,
    totalCorrect: profile.total_correct,
    totalPoints: profile.total_points,
    bestStreak: profile.best_streak,
    currentStreak: profile.current_streak,
    streakDays: profile.streak_days,
    lastPlayDate: profile.last_play_date,
    easyAnswered: profile.easy_answered,
    easyCorrect: profile.easy_correct,
    mediumAnswered: profile.medium_answered,
    mediumCorrect: profile.medium_correct,
    hardAnswered: profile.hard_answered,
    hardCorrect: profile.hard_correct,
    totalTimeMs: profile.total_time_ms,
    coins: profile.coins,
    achievements: profile.achievements,
    completedLessons: profile.completed_lessons,
  };
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      const p: Profile = {
        ...data,
        achievements: Array.isArray(data.achievements) ? data.achievements as string[] : [],
        completed_lessons: Array.isArray(data.completed_lessons) ? data.completed_lessons as number[] : [],
      };
      setProfile(p);
      // Sync to localStorage as well
      saveStats(profileToStats(p));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const syncStats = useCallback(async (stats: PlayerStats) => {
    if (!user) return;
    const updates = statsToProfile(stats);
    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    // Refresh local
    fetchProfile();
  }, [user, fetchProfile]);

  // Migrate localStorage stats to DB on first login
  const migrateLocalStats = useCallback(async () => {
    if (!user || !profile) return;
    const localStats = getStats();
    // Only migrate if local has more data
    if (localStats.totalAnswered > profile.total_answered) {
      await syncStats(localStats);
    }
  }, [user, profile, syncStats]);

  useEffect(() => {
    if (profile) {
      migrateLocalStats();
    }
  }, [profile?.id]);

  return { profile, loading, syncStats, fetchProfile };
}
