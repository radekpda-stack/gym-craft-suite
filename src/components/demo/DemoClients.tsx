import { useDemoMode } from '@/contexts/DemoContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Phone, Mail, Star, Calendar, Wallet } from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { cs } from 'date-fns/locale';
import { toast } from 'sonner';

export function DemoClients() {
  const { demoClient, isDemoBlocked } = useDemoMode();

  const handleAddClient = () => {
    toast.info('Demo omezení', {
      description: 'V demo režimu lze zobrazit pouze vzorového klienta.',
    });
  };

  const calculateAge = (birthDate: string) => {
    return differenceInYears(new Date(), new Date(birthDate));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Klienti</h1>
          <p className="text-sm text-muted-foreground">
            {demoClient ? '1 klient' : '0 klientů'} (DEMO)
          </p>
        </div>
        <Button className="gap-2" onClick={handleAddClient}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nový klient</span>
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Hledat klienta..." 
          className="pl-9 glass border-0"
          disabled
        />
      </div>

      {/* Demo Info Banner */}
      <div className="glass rounded-xl p-4 bg-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong className="text-primary">DEMO režim:</strong> Zobrazují se pouze vzorová data. 
          V reálné aplikaci zde uvidíte své skutečné klienty.
        </p>
      </div>

      {/* Client Card */}
      {demoClient ? (
        <Card className="glass border-0 hover:shadow-md transition-all cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-success">
                  <span className="text-xl font-bold text-primary">
                    {demoClient.name.charAt(0)}
                  </span>
                </div>
                <Star className="absolute -top-1 -right-1 w-5 h-5 text-warning fill-warning" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">{demoClient.name}</h3>
                  <Badge variant="outline" className="shrink-0">
                    {demoClient.gender === 'male' ? 'Muž' : 'Žena'}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" />
                    {demoClient.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {demoClient.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {calculateAge(demoClient.birth_date)} let
                  </span>
                </div>

                {/* Goals */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {demoClient.training_goals.map((goal, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {goal}
                    </Badge>
                  ))}
                </div>

                {/* Health restrictions */}
                {demoClient.health_restrictions && (
                  <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 mb-3">
                    <p className="text-xs text-warning-foreground">
                      ⚠️ {demoClient.health_restrictions}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1 text-success">
                    <Wallet className="w-4 h-4" />
                    <span className="font-medium">{demoClient.credit_balance.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Klient od {format(new Date(demoClient.created_at), 'd. MMMM yyyy', { locale: cs })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="glass rounded-xl p-12 text-center">
          <p className="text-muted-foreground">Žádní klienti k zobrazení</p>
        </div>
      )}

      {/* Notes */}
      {demoClient?.notes && (
        <Card className="glass border-0">
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Poznámky</h4>
            <p className="text-sm text-muted-foreground">{demoClient.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
