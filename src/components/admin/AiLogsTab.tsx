import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { History, FileText, User, RefreshCw } from 'lucide-react';

interface AiLog {
  id: string;
  display_name: string;
  source_text: string;
  question_count: number;
  difficulty: string | null;
  category: string | null;
  created_at: string;
}

const difficultyLabel: Record<string, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

export default function AiLogsTab() {
  const [items, setItems] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AiLog | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ai_generation_logs')
      .select('id, display_name, source_text, question_count, difficulty, category, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setItems((data as AiLog[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
          <History size={16} className="text-secondary" /> Histórico de geração com IA
        </h2>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={load}>
          <RefreshCw size={14} />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">{items.length} gerações registradas</p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma geração registrada ainda.
        </p>
      ) : (
        items.map((log) => (
          <button
            key={log.id}
            onClick={() => setSelected(log)}
            className="glass-card p-3 w-full text-left"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                  <User size={12} className="text-muted-foreground" />
                  {log.display_name || 'Sem nome'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">{log.source_text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                  {log.category ? ` • ${log.category}` : ''}
                  {log.difficulty ? ` • ${difficultyLabel[log.difficulty] ?? log.difficulty}` : ''}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary/15 text-secondary text-xs font-bold px-2 py-1">
                {log.question_count} perg.
              </span>
            </div>
          </button>
        ))
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText size={18} className="text-secondary" /> Detalhes da geração
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">Gerado por</p>
                  <p className="font-medium text-foreground">{selected.display_name || 'Sem nome'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Perguntas criadas</p>
                  <p className="font-medium text-foreground">{selected.question_count}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Categoria</p>
                  <p className="font-medium text-foreground">{selected.category || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Dificuldade</p>
                  <p className="font-medium text-foreground">
                    {selected.difficulty ? difficultyLabel[selected.difficulty] ?? selected.difficulty : '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground">Data</p>
                  <p className="font-medium text-foreground">
                    {new Date(selected.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Texto usado</p>
                <div className="glass-card p-3 whitespace-pre-wrap text-xs text-foreground max-h-[40vh] overflow-y-auto">
                  {selected.source_text}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
