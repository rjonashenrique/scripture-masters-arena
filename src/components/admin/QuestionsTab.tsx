import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DownloadCloud, Search } from 'lucide-react';
import { questions as staticQuestions } from '@/data/questions';

interface DBQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  difficulty: string;
  category: string;
  reference: string | null;
}

const emptyForm = {
  id: null as number | null,
  question: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  explanation: '',
  difficulty: 'easy',
  category: 'Antigo Testamento',
  reference: '',
};

export default function QuestionsTab() {
  const [items, setItems] = useState<DBQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quiz_questions')
      .select('id, question, options, correct_answer, explanation, difficulty, category, reference')
      .order('id', { ascending: true })
      .limit(1000);
    setItems(((data as any[]) ?? []).map((d) => ({ ...d, options: Array.isArray(d.options) ? d.options : [] })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const importFromApp = async () => {
    setImporting(true);
    const rows = staticQuestions.map((q) => ({
      id: q.id,
      correct_answer: q.correct,
      question: q.question,
      options: q.options as unknown as string[],
      explanation: q.explanation,
      difficulty: q.difficulty,
      category: q.category,
      reference: q.reference ?? null,
    }));
    const { error } = await supabase.from('quiz_questions').upsert(rows as any, { onConflict: 'id' });
    setImporting(false);
    if (error) return toast.error('Erro ao importar: ' + error.message);
    toast.success(`${rows.length} perguntas importadas`);
    load();
  };

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (q: DBQuestion) => {
    setForm({
      id: q.id,
      question: q.question || '',
      options: [0, 1, 2, 3].map((i) => q.options[i] ?? ''),
      correct_answer: q.correct_answer ?? 0,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'easy',
      category: q.category || 'Antigo Testamento',
      reference: q.reference || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.question.trim()) return toast.error('Informe a pergunta');
    if (form.options.some((o) => !o.trim())) return toast.error('Preencha as 4 alternativas');
    const payload = {
      question: form.question.trim(),
      options: form.options,
      correct_answer: form.correct_answer,
      explanation: form.explanation.trim(),
      difficulty: form.difficulty,
      category: form.category,
      reference: form.reference.trim() || null,
    };
    let error;
    if (form.id) {
      ({ error } = await supabase.from('quiz_questions').update(payload as any).eq('id', form.id));
    } else {
      ({ error } = await supabase.from('quiz_questions').insert(payload as any));
    }
    if (error) return toast.error('Erro ao salvar');
    toast.success('Salvo');
    setOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!window.confirm('Excluir esta pergunta?')) return;
    const { error } = await supabase.from('quiz_questions').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir');
    toast.success('Excluída');
    load();
  };

  const filtered = items.filter((q) =>
    (q.question || '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button onClick={openNew} size="sm" className="flex-1">
          <Plus size={14} /> Nova
        </Button>
        <Button onClick={importFromApp} size="sm" variant="outline" disabled={importing} className="flex-1">
          <DownloadCloud size={14} /> {importing ? 'Importando...' : 'Importar do app'}
        </Button>
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar pergunta..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{items.length} perguntas no banco</p>

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhuma pergunta. Use "Importar do app" para começar.
        </p>
      ) : (
        filtered.map((q) => (
          <div key={q.id} className="glass-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{q.question}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {q.difficulty} • {q.category}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(q.id)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar pergunta' : 'Nova pergunta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Pergunta"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
            />
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={form.correct_answer === i}
                  onChange={() => setForm({ ...form, correct_answer: i })}
                  className="shrink-0"
                />
                <Input
                  placeholder={`Alternativa ${i + 1}`}
                  value={opt}
                  onChange={(e) => {
                    const options = [...form.options];
                    options[i] = e.target.value;
                    setForm({ ...form, options });
                  }}
                />
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Marque a alternativa correta no botão à esquerda.</p>
            <Textarea
              placeholder="Explicação"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="easy">Fácil</option>
                <option value="medium">Médio</option>
                <option value="hard">Difícil</option>
              </select>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {['Antigo Testamento', 'Novo Testamento', 'Vida de Jesus', 'Personagens da Bíblia', 'Milagres de Jesus', 'Profetas', 'Conhecimento Geral'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Input
              placeholder="Referência (ex: Gênesis 6:14)"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
