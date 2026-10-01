import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import QuizPage from "@/pages/QuizPage";
import ProfilePage from "@/pages/ProfilePage";
import AchievementsPage from "@/pages/AchievementsPage";

import ChallengePage from "@/pages/ChallengePage";
import BattleLobbyPage from "@/pages/BattleLobbyPage";
import BattleGamePage from "@/pages/BattleGamePage";
import BattleRoyaleLobbyPage from "@/pages/BattleRoyaleLobbyPage";
import BattleRoyaleGamePage from "@/pages/BattleRoyaleGamePage";
import RankingPage from "@/pages/RankingPage";
import ClansPage from "@/pages/ClansPage";
import ClanInvitePage from "@/pages/ClanInvitePage";
import BibleReaderPage from "@/pages/BibleReaderPage";
import DevotionalPage from "@/pages/DevotionalPage";
import ReadingPlanPage from "@/pages/ReadingPlanPage";
import AdminPage from "@/pages/AdminPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/NotFound";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-gold flex items-center justify-center mb-3 animate-pulse">
            <span className="text-xl">✝️</span>
          </div>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (window.location.pathname.startsWith('/clan/invite/')) {
      // Rota privada: sem sessão, só login/cadastro. A URL é mantida, então após entrar o convite abre sozinho.
      return (
        <div className="max-w-md mx-auto relative">
          <div className="mx-5 mt-4 rounded-xl border border-primary/30 bg-primary/10 p-3 text-center text-sm font-semibold text-foreground">
            🔐 Entre na sua conta para visualizar este convite.
          </div>
          <AuthPage />
        </div>
      );
    }
    return <AuthPage />;
  }

  if (window.location.pathname.startsWith('/admin')) {
    return (
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    );
  }

  return (
    <div className="max-w-md mx-auto relative">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/battle" element={<BattleLobbyPage />} />
        <Route path="/battle/:id" element={<BattleGamePage />} />
        <Route path="/battle-royale" element={<BattleRoyaleLobbyPage />} />
        <Route path="/battle-royale/:id" element={<BattleRoyaleGamePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/clans" element={<ClansPage />} />
        <Route path="/clan/invite/:token" element={<ClanInvitePage />} />

        <Route path="/bible" element={<BibleReaderPage />} />
        <Route path="/reading-plan" element={<ReadingPlanPage />} />
        <Route path="/devotional" element={<DevotionalPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
