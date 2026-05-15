export const ROUND_NAMES: Record<number, string> = {
  1: 'Oitavas',
  2: 'Quartas',
  3: 'Semifinal',
  4: 'Final',
};

export function roundName(round: number, totalRounds = 4): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Semifinal';
  if (fromEnd === 2) return 'Quartas';
  return `Rodada ${round}`;
}

export function tournamentPhaseLabel(status: string, current_round: number, total_rounds: number): string {
  if (status === 'registration') return 'Inscrições abertas';
  if (status === 'finished') return 'Encerrado';
  return `Em andamento — ${roundName(current_round, total_rounds)}`;
}

export function formatCountdown(target: string | Date): string {
  const t = new Date(target).getTime() - Date.now();
  if (t <= 0) return '0s';
  const s = Math.floor(t / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
