import { motion } from 'framer-motion';
import { BookOpen, Swords, Trophy, User, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMyClanInvites } from '@/hooks/useClanInvites';

const tabs = [
  { path: '/', icon: BookOpen, label: 'Início' },
  { path: '/clans', icon: Shield, label: 'Clãs' },
  { path: '/battle', icon: Swords, label: 'Batalha' },
  { path: '/ranking', icon: Trophy, label: 'Ranking' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useMyClanInvites();

  // Hide nav during quiz
  if (location.pathname === '/quiz' || location.pathname.startsWith('/battle/') || location.pathname === '/devotional') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-auto max-w-md bg-card/95 backdrop-blur-xl border-t border-border/50">
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            const badge = path === '/clans' ? count : 0;
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-0.5 px-3 py-1 relative"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-gold"
                  />
                )}
                <div className="relative">
                  <Icon
                    size={20}
                    className={active ? 'text-secondary' : 'text-muted-foreground'}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-secondary' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
