import { useState } from 'react';
import {
  Calendar,
  Download,
  Upload,
  Link2,
  Bell,
  Clock,
  Check,
  CreditCard,
  Package,
  Tag,
  Dumbbell,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ProductsManagement } from '@/components/settings/ProductsManagement';
import { TrainingPricesSettings } from '@/components/settings/TrainingPricesSettings';
import { TagsManagement } from '@/components/settings/TagsManagement';
import { ExercisesManagement } from '@/components/settings/ExercisesManagement';
import { PaymentTagsManagement } from '@/components/settings/PaymentTagsManagement';

export default function Settings() {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);

  const settingsSections = [
    {
      title: 'Ceny a kredit',
      description: 'Nastavení cen tréninků a limitů kreditu',
      icon: CreditCard,
      content: <TrainingPricesSettings />,
    },
    {
      title: 'Platební tagy',
      description: 'Správa platebních tagů pro kreditové transakce (hotovost, účet 1, účet 2...)',
      icon: Wallet,
      content: <PaymentTagsManagement />,
    },
    {
      title: 'Produkty a služby',
      description: 'Správa produktů k prodeji (elektrolyty, drinky, měření...)',
      icon: Package,
      content: <ProductsManagement />,
    },
    {
      title: 'Knihovna cviků',
      description: 'Správa databáze cviků pro tréninky',
      icon: Dumbbell,
      content: <ExercisesManagement />,
    },
    {
      title: 'Tagy',
      description: 'Správa tagů pro označování položek',
      icon: Tag,
      content: <TagsManagement />,
    },
    {
      title: 'Integrace kalendářů',
      description: 'Propojte své kalendáře pro synchronizaci tréninků',
      icon: Calendar,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl glass-subtle">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#4285F4]/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#4285F4]">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  {googleConnected ? 'Propojeno' : 'Nepropojeno'}
                </p>
              </div>
            </div>
            <Button
              variant={googleConnected ? 'outline' : 'default'}
              onClick={() => setGoogleConnected(!googleConnected)}
              className="gap-2"
            >
              {googleConnected ? (
                <>
                  <Check className="w-4 h-4" />
                  Odpojit
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Propojit
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl glass-subtle">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-foreground/10 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground">
                  <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Apple Calendar</p>
                <p className="text-sm text-muted-foreground">
                  {appleConnected ? 'Propojeno' : 'Nepropojeno'}
                </p>
              </div>
            </div>
            <Button
              variant={appleConnected ? 'outline' : 'default'}
              onClick={() => setAppleConnected(!appleConnected)}
              className="gap-2"
            >
              {appleConnected ? (
                <>
                  <Check className="w-4 h-4" />
                  Odpojit
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Propojit
                </>
              )}
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: 'Notifikace',
      description: 'Nastavení upozornění a připomínek',
      icon: Bell,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Push notifikace</Label>
              <p className="text-sm text-muted-foreground">
                Dostávat upozornění na nadcházející tréninky
              </p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Email připomínky</Label>
              <p className="text-sm text-muted-foreground">
                Denní přehled tréninků emailem
              </p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Upozornění na nízký kredit</Label>
              <p className="text-sm text-muted-foreground">
                Upozornit při poklesu kreditu pod limit
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      ),
    },
    {
      title: 'Pracovní doba',
      description: 'Nastavení pracovních hodin',
      icon: Clock,
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-muted-foreground text-sm">Začátek</Label>
            <Input
              type="time"
              defaultValue="06:00"
              className="mt-2 glass-input rounded-xl text-center"
            />
          </div>
          <div>
            <Label className="text-muted-foreground text-sm">Konec</Label>
            <Input
              type="time"
              defaultValue="20:00"
              className="mt-2 glass-input rounded-xl text-center"
            />
          </div>
        </div>
      ),
    },
    {
      title: 'Export a zálohy',
      description: 'Správa dat a zálohování',
      icon: Download,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Automatické zálohy</Label>
              <p className="text-sm text-muted-foreground">
                Týdenní záloha všech dat
              </p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 flex-1 glass-subtle border-0">
              <Download className="w-4 h-4" />
              Exportovat vše
            </Button>
            <Button variant="outline" className="gap-2 flex-1 glass-subtle border-0">
              <Upload className="w-4 h-4" />
              Import dat
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Nastavení
        </h1>
        <p className="text-muted-foreground mt-1">
          Konfigurace aplikace a integrace
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {settingsSections.map((section) => (
          <div key={section.title} className="glass rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <section.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {section.description}
                </p>
              </div>
            </div>
            {section.content}
          </div>
        ))}
      </div>
    </div>
  );
}
