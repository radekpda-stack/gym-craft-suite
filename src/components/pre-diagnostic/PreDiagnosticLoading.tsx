import { Loader2 } from 'lucide-react';

export function PreDiagnosticLoading() {
  return (
    <div className="public-page flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Načítám formulář...</p>
      </div>
    </div>
  );
}
