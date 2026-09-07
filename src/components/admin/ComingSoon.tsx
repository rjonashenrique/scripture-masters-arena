import { Construction } from 'lucide-react';

export default function ComingSoon({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
        <Construction size={28} className="mx-auto text-secondary" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Esta área depende de recursos que ainda não existem no aplicativo. Assim que eles forem criados,
          o painel poderá gerenciar:
        </p>
        <ul className="text-xs text-muted-foreground space-y-1">
          {items.map((i) => <li key={i}>• {i}</li>)}
        </ul>
      </div>
    </div>
  );
}
