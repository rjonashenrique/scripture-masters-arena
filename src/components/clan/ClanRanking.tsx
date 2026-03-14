import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getTierByPoints } from '@/lib/leagueUtils';

interface ClanRankingProps {
  allClans: any[];
  myClanId: string | null;
}

export default function ClanRanking({ allClans, myClanId }: ClanRankingProps) {
  return (
    <motion.div
      key="ranking"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3"
    >
      <h3 className="font-bold font-display text-foreground flex items-center gap-2">
        <Trophy size={18} className="text-secondary" />
        Ranking dos Clãs
      </h3>

      {/* Podium */}
      {allClans.length >= 3 && (
        <div className="flex items-end justify-center gap-2 py-4">
          {[allClans[1], allClans[0], allClans[2]].map((c, i) => {
            const heights = ['h-20', 'h-28', 'h-16'];
            const medals = ['🥈', '🥇', '🥉'];
            const tier = getTierByPoints(c.total_points);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center"
              >
                <span className="text-2xl mb-1">{medals[i]}</span>
                <p className="text-[10px] font-bold text-foreground text-center w-20 truncate">{c.name}</p>
                <p className="text-[9px] text-muted-foreground mb-1">{tier.icon} {c.total_points.toLocaleString()}</p>
                <div className={`w-20 ${heights[i]} rounded-t-xl ${i === 1 ? 'bg-gradient-gold' : 'glass-card'}`} />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* List */}
      {allClans.map((c, i) => {
        const tier = getTierByPoints(c.total_points);
        return (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`glass-card p-3 flex items-center gap-3 ${c.id === myClanId ? 'ring-1 ring-secondary/30' : ''}`}
          >
            <span className="w-7 text-center font-bold text-sm text-muted-foreground">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">
                {tier.icon} {c.name}
                {c.id === myClanId && <span className="text-[10px] text-secondary ml-1">⚔️</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{tier.name} · {c.member_count} membros</p>
            </div>
            <span className="text-sm font-bold text-gradient-gold">{c.total_points.toLocaleString()}</span>
          </motion.div>
        );
      })}

      {allClans.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum clã cadastrado ainda</div>
      )}
    </motion.div>
  );
}
