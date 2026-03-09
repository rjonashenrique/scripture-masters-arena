import { motion } from 'framer-motion';
import { BookOpen, Zap, Trophy, User, Map } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/', icon: BookOpen, label: 'Início' },
  { path: '/challenge', icon: Zap, label: 'Desafio' },
  { path: '/journey', icon: Map, label: 'Jornada' },
  { path: '/achievements', icon: Trophy, label: 'Troféus' },
  { path: '/profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide nav during quiz
  if (location.pathname === '/quiz') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="mx-auto max-w-md bg-card/95 backdrop-blur-xl border-t border-border/50">
        <div className="flex justify-around items-center h-16 px-2">
          {tabs.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
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
                <Icon
                  size={20}
                  className={active ? 'text-secondary' : 'text-muted-foreground'}
                />
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
