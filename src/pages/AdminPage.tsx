import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, BarChart3, Users, HelpCircle, Trophy, History } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import MetricsTab from '@/components/admin/MetricsTab';
import UsersTab from '@/components/admin/UsersTab';
import QuestionsTab from '@/components/admin/QuestionsTab';
import ChampionshipsTab from '@/components/admin/ChampionshipsTab';
import AiLogsTab from '@/components/admin/AiLogsTab';

export default function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, adminExists, loading, refresh } = useUserRole();

  const claimAdmin = async () => {
    const { error } = await (supabase.rpc as any)('claim_admin');
    if (error) return toast.error('Não foi possível: ' + error.message);
    toast.success('Você agora é administrador!');
    refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-6 text-center gap-4">
        <ShieldCheck size={48} className="text-secondary" />
        <h1 className="text-xl font-bold font-display text-foreground">Painel Admin</h1>
        <p className="text-sm text-muted-foreground">
          {adminExists
            ? 'Você não tem permissão para acessar esta área.'
            : 'Nenhum administrador definido. Torne-se o primeiro administrador.'}
        </p>
        {!adminExists && <Button onClick={claimAdmin}>Tornar-me administrador</Button>}
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="px-5 pt-12 pb-4 safe-area-top">
        <div className="flex items-center gap-2 mb-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-2xl font-extrabold font-display text-foreground flex items-center gap-2">
            <ShieldCheck size={22} className="text-secondary" /> Painel Admin
          </h1>
        </div>
      </div>

      <div className="px-5">
        <Tabs defaultValue="metrics">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="metrics"><BarChart3 size={16} /></TabsTrigger>
            <TabsTrigger value="users"><Users size={16} /></TabsTrigger>
            <TabsTrigger value="questions"><HelpCircle size={16} /></TabsTrigger>
            <TabsTrigger value="championships"><Trophy size={16} /></TabsTrigger>
          </TabsList>
          <TabsContent value="metrics"><MetricsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="questions"><QuestionsTab /></TabsContent>
          <TabsContent value="championships"><ChampionshipsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
