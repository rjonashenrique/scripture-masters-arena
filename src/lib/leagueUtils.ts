export interface LeagueTier {
  id: string;
  name: string;
  icon: string;
  color: string;
  minPoints: number;
  gradient: string;
}

export const LEAGUE_TIERS: LeagueTier[] = [
  { id: 'legend', name: 'Lenda', icon: '🏆', color: 'text-amber-300', minPoints: 50000, gradient: 'from-amber-400 to-amber-600' },
  { id: 'master', name: 'Mestre', icon: '💎', color: 'text-purple-400', minPoints: 30000, gradient: 'from-purple-400 to-purple-600' },
  { id: 'diamond', name: 'Diamante', icon: '💠', color: 'text-cyan-400', minPoints: 15000, gradient: 'from-cyan-400 to-cyan-600' },
  { id: 'gold', name: 'Ouro', icon: '🥇', color: 'text-yellow-400', minPoints: 7500, gradient: 'from-yellow-400 to-yellow-600' },
  { id: 'silver', name: 'Prata', icon: '🥈', color: 'text-slate-300', minPoints: 3000, gradient: 'from-slate-300 to-slate-500' },
  { id: 'bronze', name: 'Bronze', icon: '🥉', color: 'text-orange-400', minPoints: 0, gradient: 'from-orange-400 to-orange-600' },
];

export function getTierByPoints(points: number): LeagueTier {
  return LEAGUE_TIERS.find(t => points >= t.minPoints) || LEAGUE_TIERS[LEAGUE_TIERS.length - 1];
}

export function getTierById(id: string): LeagueTier {
  return LEAGUE_TIERS.find(t => t.id === id) || LEAGUE_TIERS[LEAGUE_TIERS.length - 1];
}

export function getNextTier(currentTierId: string): LeagueTier | null {
  const idx = LEAGUE_TIERS.findIndex(t => t.id === currentTierId);
  return idx > 0 ? LEAGUE_TIERS[idx - 1] : null;
}
