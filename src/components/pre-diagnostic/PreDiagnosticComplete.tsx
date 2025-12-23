import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PreDiagnosticComplete() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full glass border-0">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-xl font-bold mb-2">Děkujeme!</h1>
          <p className="text-muted-foreground mb-4">
            Váš formulář byl úspěšně odeslán. Váš trenér se s vámi brzy spojí.
          </p>
          <p className="text-sm text-muted-foreground">
            Tuto stránku můžete nyní zavřít.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
