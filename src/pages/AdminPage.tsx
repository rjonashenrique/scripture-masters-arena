import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  ArrowLeft, ShieldCheck, BarChart3, Users, HelpCircle, FolderTree, Gamepad2, Map as MapIcon, ShoppingBag,
  Trophy, Swords, Medal, Award, Target, Siren, LineChart, Megaphone, Settings, ScrollText, Menu, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_LABELS, useAdminRole } from '@/hooks/useAdminRole';
import DashboardTab from '@/components/admin/DashboardTab';
import UsersTab from '@/components/admin/UsersTab';
import QuestionsTab from '@/components/admin/QuestionsTab';
import CategoriesTab from '@/components/admin/CategoriesTab';
import SettingsTab from '@/components/admin/SettingsTab';
import ChampionshipsTab from '@/components/admin/ChampionshipsTab';
import ClansTab from '@/components/admin/ClansTab';
import InvitesTab from '@/components/admin/InvitesTab';
import ModerationTab from '@/components/admin/ModerationTab';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import AnnouncementsTab from '@/components/admin/AnnouncementsTab';
import AuditTab from '@/components/admin/AuditTab';
import AiLogsTab from '@/components/admin/AiLogsTab';
import ShopTab from '@/components/admin/ShopTab';
import ComingSoon from '@/components/admin/ComingSoon';

type SectionId =
  | 'dashboard' | 'users' | 'questions' | 'categories' | 'modes' | 'journey' | 'cup'
  | 'clans' | 'invites' | 'seasons' | 'achievements' | 'missions' | 'moderation'
  | 'analytics' | 'announcements' | 'settings' | 'audit' | 'ailogs' | 'shop';

interface Section {
  id: SectionId;
  label: string;
  icon: typeof Users;
  need: 'staff' | 'users' | 'content' | 'settings';
  render: () => JSX.Element;
}

const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Visão Geral', icon: BarChart3, need: 'staff', render: () => <DashboardTab /> },
  { id: 'users', label: 'Usuários', icon: Users, need: 'users', render: () => <UsersTab /> },
  { id: 'questions', label: 'Perguntas', icon: HelpCircle, need: 'content', render: () => <QuestionsTab /> },
  { id: 'categories', label: 'Categorias', icon: FolderTree, need: 'content', render: () => <CategoriesTab /> },
  { id: 'modes', label: 'Modos', icon: Gamepad2, need: 'settings', render: () => <SettingsTab only="modos" /> },
  {
    id: 'journey', label: 'Jornada', icon: MapIcon, need: 'content',
    render: () => <ComingSoon title="Jornada Bíblica" items={['Unidades e lições', 'Ordem e requisitos', 'Provas e XP', 'Taxa de conclusão por unidade']} />,
  },
  { id: 'cup', label: 'Copa', icon: Trophy, need: 'settings', render: () => <ChampionshipsTab /> },
  { id: 'clans', label: 'Clãs', icon: Swords, need: 'staff', render: () => <ClansTab /> },
  { id: 'invites', label: 'Convites', icon: Medal, need: 'staff', render: () => <InvitesTab /> },
  {
    id: 'seasons', label: 'Temporadas', icon: Medal, need: 'settings',
    render: () => <ComingSoon title="Temporadas" items={['Temporada atual e histórico', 'Configuração das ligas Bronze a Lendária', 'Promoções e rebaixamentos']} />,
  },
  {
    id: 'achievements', label: 'Conquistas', icon: Award, need: 'content',
    render: () => <ComingSoon title="Conquistas" items={['Nome, ícone e descrição', 'Critério e XP', 'Raridade e ativação']} />,
  },
  {
    id: 'missions', label: 'Missões', icon: Target, need: 'content',
    render: () => <ComingSoon title="Missões" items={['Missões diárias, semanais e de evento', 'Objetivo e recompensa', 'Período e modo relacionado']} />,
  },
  { id: 'moderation', label: 'Moderação', icon: Siren, need: 'users', render: () => <ModerationTab /> },
  { id: 'analytics', label: 'Analytics', icon: LineChart, need: 'staff', render: () => <AnalyticsTab /> },
  { id: 'announcements', label: 'Avisos', icon: Megaphone, need: 'settings', render: () => <AnnouncementsTab /> },
  { id: 'settings', label: 'Configurações', icon: Settings, need: 'settings', render: () => <SettingsTab /> },
  { id: 'audit', label: 'Auditoria', icon: ScrollText, need: 'staff', render: () => <AuditTab /> },
  { id: 'ailogs', label: 'Histórico IA', icon: History, need: 'content', render: () => <AiLogsTab /> },
  { id: 'shop', label: 'Loja', icon: ShoppingBag, need: 'settings', render: () => <ShopTab /> },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const { roles, loading, adminExists, refresh, isStaff, canManageUsers, canManageContent, canManageSettings } = useAdminRole();
  const [current, setCurrent] = useState<SectionId>('dashboard');

  const allowed = SECTIONS.filter((s) =>
    s.need === 'staff' ? isStaff
      : s.need === 'users' ? canManageUsers
      : s.need === 'content' ? canManageContent
      : canManageSettings,
  );

  const claimAdmin = async () => {
    const { error } = await (supabase.rpc as any)('claim_admin');
    if (error) return toast.error('Não foi possível: ' + error.message);
    toast.success('Você agora é administrador!');
    refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <ShieldCheck size={48} className="text-secondary" />
        <h1 className="text-xl font-bold font-display text-foreground">Painel Admin</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {adminExists
            ? 'Você não tem permissão para acessar esta área.'
            : 'Nenhum administrador definido. Torne-se o primeiro administrador.'}
        </p>
        {!adminExists && <Button onClick={claimAdmin}>Tornar-me administrador</Button>}
        <Button variant="ghost" onClick={() => navigate('/')}><ArrowLeft size={16} /> Voltar</Button>
      </div>
    );
  }

  const active = allowed.find((s) => s.id === current) ?? allowed[0];

  const Nav = ({ onPick }: { onPick?: () => void }) => (
    <nav className="space-y-1">
      {allowed.map((s) => (
        <button
          key={s.id}
          onClick={() => { setCurrent(s.id); onPick?.(); }}
          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
            active?.id === s.id
              ? 'bg-primary/10 text-primary font-semibold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <s.icon size={16} className="shrink-0" />
          {s.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden"><Menu size={18} /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 pt-10">
              <Nav />
            </SheetContent>
          </Sheet>
          <ShieldCheck size={20} className="text-secondary" />
          <h1 className="text-lg font-bold font-display text-foreground">Painel Admin</h1>
          <div className="hidden md:flex gap-1 ml-2">
            {roles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{ROLE_LABELS[r] ?? r}</Badge>)}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Voltar ao app
          </Button>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-60 shrink-0 border-r border-border p-3 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <Nav />
        </aside>
        <main className="flex-1 min-w-0 p-4 md:p-6">
          {active?.render()}
        </main>
      </div>
    </div>
  );
}
