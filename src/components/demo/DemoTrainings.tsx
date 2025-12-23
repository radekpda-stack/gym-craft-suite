import { useDemoMode } from '@/contexts/DemoContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Clock, User, Dumbbell, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';

export function DemoTrainings() {
  const { demoTraining, demoClient } = useDemoMode();

  const handleAddTraining = () => {
    toast.info('Demo omezení', {
      description: 'V demo režimu lze zobrazit pouze vzorový trénink.',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> Dokončeno</Badge>;
      case 'scheduled':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Naplánováno</Badge>;
      case 'canceled':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> Zrušeno</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tréninky</h1>
          <p className="text-sm text-muted-foreground">
            {demoTraining ? '1 trénink' : '0 tréninků'} (DEMO)
          </p>
        </div>
        <Button className="gap-2" onClick={handleAddTraining}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nový trénink</span>
        </Button>
      </div>

      {/* Demo Info Banner */}
      <div className="glass rounded-xl p-4 bg-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong className="text-primary">DEMO režim:</strong> Zobrazují se pouze vzorová data. 
          V reálné aplikaci zde uvidíte své skutečné tréninky a kalendář.
        </p>
      </div>

      {/* Training Card */}
      {demoTraining ? (
        <Card className="glass border-0 hover:shadow-md transition-all">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-primary" />
                {format(new Date(demoTraining.date), "EEEE, d. MMMM yyyy", { locale: cs })}
              </CardTitle>
              {getStatusBadge(demoTraining.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Time & Duration */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{format(new Date(demoTraining.date), 'HH:mm', { locale: cs })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Délka:</span>
                <span>{demoTraining.duration} min</span>
              </div>
            </div>

            {/* Client */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{demoClient?.name || 'Demo klient'}</p>
                <p className="text-sm text-muted-foreground">
                  {demoTraining.participant_count} účastník • {demoTraining.training_type}
                </p>
              </div>
            </div>

            {/* Training Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Typ tréninku</p>
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  <span className="font-medium capitalize">{demoTraining.training_type}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Cíl</p>
                <span className="font-medium">{demoTraining.training_goal}</span>
              </div>
            </div>

            {/* Notes */}
            {demoTraining.notes && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs text-muted-foreground mb-1">Poznámky</p>
                <p className="text-sm">{demoTraining.notes}</p>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <span className="text-muted-foreground">Cena</span>
              <span className="font-semibold text-lg">{demoTraining.final_price.toLocaleString('cs-CZ')} Kč</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">Žádné tréninky k zobrazení</p>
        </div>
      )}

      {/* Quick Stats */}
      <Card className="glass border-0">
        <CardHeader>
          <CardTitle className="text-base">Přehled (DEMO)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">24</p>
              <p className="text-xs text-muted-foreground">Celkem tréninků</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">23</p>
              <p className="text-xs text-muted-foreground">Dokončeno</p>
            </div>
            <div>
              <p className="text-2xl font-bold">1</p>
              <p className="text-xs text-muted-foreground">Naplánováno</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
