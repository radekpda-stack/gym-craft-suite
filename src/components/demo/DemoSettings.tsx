import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings, Globe, CreditCard, Dumbbell, Package, RefreshCw } from 'lucide-react';
import { useDemoMode } from '@/contexts/DemoContext';
import { toast } from 'sonner';

export function DemoSettings() {
  const { resetDemo } = useDemoMode();

  const handleResetDemo = () => {
    resetDemo();
    toast.success('Demo data byla resetována');
  };

  const settingsCategories = [
    {
      title: 'Profil',
      icon: Settings,
      items: ['Jazyk aplikace', 'Firemní profil'],
    },
    {
      title: 'Tréninky',
      icon: Dumbbell,
      items: ['Ceny tréninků', 'Pracovní doba', 'Sdílení kalendáře'],
    },
    {
      title: 'Klienti a Finance',
      icon: CreditCard,
      items: ['Tréninkové balíčky', 'Prahy kreditu', 'Nastavení feedbacku'],
    },
    {
      title: 'Knihovny',
      icon: Package,
      items: ['Cviky', 'Štítky'],
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Nastavení</h1>
          <p className="text-sm text-muted-foreground">DEMO režim</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          DEMO
        </Badge>
      </div>

      {/* Demo Info Banner */}
      <div className="glass rounded-xl p-4 bg-primary/5 border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong className="text-primary">DEMO režim:</strong> Nastavení jsou pouze pro ukázku. 
          Změny se neukládají do databáze.
        </p>
      </div>

      {/* Reset Demo Button */}
      <Card className="glass border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Resetovat DEMO data</h3>
                <p className="text-sm text-muted-foreground">Obnoví všechna demo data do původního stavu</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleResetDemo}>
              Resetovat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Settings Categories */}
      {settingsCategories.map((category) => (
        <Card key={category.title} className="glass border-0">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <category.icon className="w-5 h-5 text-primary" />
              {category.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {category.items.map((item) => (
                <div 
                  key={item}
                  className="p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-colors cursor-pointer"
                  onClick={() => toast.info('Demo omezení', { description: 'Nastavení není v demo režimu k dispozici.' })}
                >
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Language Demo */}
      <Card className="glass border-0">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-5 h-5 text-primary" />
            Jazyk (ukázka)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="default" className="flex-1 gap-2">
              <span>🇨🇿</span>
              Čeština
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <span>🇬🇧</span>
              English
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
