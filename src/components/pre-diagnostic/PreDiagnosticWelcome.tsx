import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Compass, Clock } from 'lucide-react';

interface Props {
  onStart: () => void;
  clientName?: string;
}

export function PreDiagnosticWelcome({ onStart, clientName }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full glass border-0">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Compass className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Diagnostika pohybu</h1>
          </div>

          <div className="space-y-4 mb-8">
            <p className="text-lg">
              {clientName ? `Vítej, ${clientName} 👋` : 'Vítej 👋'}
            </p>
            
            <p className="text-muted-foreground">
              Tento krátký dotazník slouží trenérovi k lepšímu pochopení tvého denního zatížení, pohybu a regenerace.
            </p>
            
            <p className="text-muted-foreground">
              Na základě odpovědí trenér upraví diagnostiku a tréninkový plán.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
            <Clock className="w-4 h-4" />
            <span>Vyplnění zabere 3–5 minut</span>
          </div>

          <Button 
            onClick={onStart} 
            className="w-full"
            size="lg"
          >
            Pokračovat
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
