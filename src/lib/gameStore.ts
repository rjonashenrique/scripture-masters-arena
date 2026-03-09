import { Difficulty } from '@/data/questions';

export interface PlayerStats {
  totalAnswered: number;
  totalCorrect: number;
  totalPoints: number;
  bestStreak: number;
  currentStreak: number;
  streakDays: number;
  lastPlayDate: string;
  easyAnswered: number;
  easyCorrect: number;
  mediumAnswered: number;
  mediumCorrect: number;
  hardAnswered: number;
  hardCorrect: number;
  totalTimeMs: number;
  coins: number;
  achievements: string[];
  completedLessons: number[];
}

const DEFAULT_STATS: PlayerStats = {
  totalAnswered: 0, totalCorrect: 0, totalPoints: 0,
  bestStreak: 0, currentStreak: 0, streakDays: 0,
  lastPlayDate: '', easyAnswered: 0, easyCorrect: 0,
  mediumAnswered: 0, mediumCorrect: 0, hardAnswered: 0,
  hardCorrect: 0, totalTimeMs: 0, coins: 0,
  achievements: [], completedLessons: [],
};

export function getStats(): PlayerStats {
  const raw = localStorage.getItem('bqm_stats');
  return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS };
}

export function saveStats(stats: PlayerStats) {
  localStorage.setItem('bqm_stats', JSON.stringify(stats));
}

export function recordAnswer(correct: boolean, difficulty: Difficulty, timeMs: number) {
  const stats = getStats();
  stats.totalAnswered++;
  stats.totalTimeMs += timeMs;

  if (difficulty === 'easy') { stats.easyAnswered++; if (correct) stats.easyCorrect++; }
  if (difficulty === 'medium') { stats.mediumAnswered++; if (correct) stats.mediumCorrect++; }
  if (difficulty === 'hard') { stats.hardAnswered++; if (correct) stats.hardCorrect++; }

  if (correct) {
    stats.totalCorrect++;
    stats.currentStreak++;
    const points = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 20 : 40;
    const bonus = Math.max(0, Math.floor((10000 - timeMs) / 1000));
    stats.totalPoints += points + bonus;
    stats.coins += Math.floor((points + bonus) / 5);
    if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  } else {
    stats.currentStreak = 0;
  }

  // Streak days
  const today = new Date().toDateString();
  if (stats.lastPlayDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    stats.streakDays = stats.lastPlayDate === yesterday ? stats.streakDays + 1 : 1;
    stats.lastPlayDate = today;
  }

  // Check achievements
  checkAchievements(stats);
  saveStats(stats);
  return stats;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: '10_streak', title: '10 Acertos Seguidos', description: 'Acerte 10 perguntas consecutivas', icon: '🔥' },
  { id: '100_answered', title: 'Centurião', description: 'Responda 100 perguntas', icon: '💯' },
  { id: '7_day_streak', title: 'Semana de Fé', description: 'Estude 7 dias seguidos', icon: '📅' },
  { id: '30_day_streak', title: 'Mês de Devoção', description: 'Estude 30 dias seguidos', icon: '🏆' },
  { id: 'nt_master', title: 'Mestre do NT', description: 'Acerte 50 perguntas do Novo Testamento', icon: '📖' },
  { id: '500_points', title: 'Discípulo Dedicado', description: 'Alcance 500 pontos', icon: '⭐' },
  { id: '1000_points', title: 'Servo Fiel', description: 'Alcance 1000 pontos', icon: '👑' },
  { id: '5000_points', title: 'Mestre da Bíblia', description: 'Alcance 5000 pontos', icon: '✝️' },
];

function checkAchievements(stats: PlayerStats) {
  if (stats.bestStreak >= 10 && !stats.achievements.includes('10_streak')) stats.achievements.push('10_streak');
  if (stats.totalAnswered >= 100 && !stats.achievements.includes('100_answered')) stats.achievements.push('100_answered');
  if (stats.streakDays >= 7 && !stats.achievements.includes('7_day_streak')) stats.achievements.push('7_day_streak');
  if (stats.streakDays >= 30 && !stats.achievements.includes('30_day_streak')) stats.achievements.push('30_day_streak');
  if (stats.totalPoints >= 500 && !stats.achievements.includes('500_points')) stats.achievements.push('500_points');
  if (stats.totalPoints >= 1000 && !stats.achievements.includes('1000_points')) stats.achievements.push('1000_points');
  if (stats.totalPoints >= 5000 && !stats.achievements.includes('5000_points')) stats.achievements.push('5000_points');
}

export function getLevel(points: number): { name: string; level: number; nextThreshold: number; progress: number } {
  const levels = [
    { name: 'Iniciante', threshold: 0 },
    { name: 'Discípulo', threshold: 200 },
    { name: 'Servo', threshold: 500 },
    { name: 'Missionário', threshold: 1500 },
    { name: 'Mestre da Bíblia', threshold: 5000 },
  ];
  let current = levels[0];
  let next = levels[1];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (points >= levels[i].threshold) {
      current = levels[i];
      next = levels[i + 1] || levels[i];
      break;
    }
  }
  const progress = next === current ? 100 : ((points - current.threshold) / (next.threshold - current.threshold)) * 100;
  return { name: current.name, level: levels.indexOf(current) + 1, nextThreshold: next.threshold, progress: Math.min(100, progress) };
}
