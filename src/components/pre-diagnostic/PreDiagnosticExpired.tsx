import { Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PreDiagnosticExpired() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full glass border-0">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-xl font-bold mb-2">Platnost formuláře vypršela</h1>
          <p className="text-muted-foreground">
            Tento odkaz již není platný. Kontaktujte prosím svého trenéra pro nový odkaz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
