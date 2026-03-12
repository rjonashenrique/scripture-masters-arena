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
import JourneyPage from "@/pages/JourneyPage";
import ChallengePage from "@/pages/ChallengePage";
import BattleLobbyPage from "@/pages/BattleLobbyPage";
import BattleGamePage from "@/pages/BattleGamePage";
import RankingPage from "@/pages/RankingPage";
import LeaguePage from "@/pages/LeaguePage";
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
    return <AuthPage />;
  }

  return (
    <div className="max-w-md mx-auto relative">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/challenge" element={<ChallengePage />} />
        <Route path="/battle" element={<BattleLobbyPage />} />
        <Route path="/battle/:id" element={<BattleGamePage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/journey" element={<JourneyPage />} />
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
